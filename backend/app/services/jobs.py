from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.models.audio_beat_map import AudioBeatMap
from app.models.job import Job
from app.models.scene import Scene
from app.models.user import User
from app.schemas.job import CreateJobRequest, RejectStoryboardRequest
from app.schemas.pipeline import ProgressEvent
from app.services.notifications import NotificationService
from app.services.progress import progress_broker
from app.services.providers.factory import make_providers
from app.services.storage import StorageService


class JobService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.storage = StorageService()
        self.notifications = NotificationService()
        # Providers are lazy-loaded so the API thread never imports heavy
        # ML dependencies (librosa, etc.) during job creation.
        self._providers_loaded = False

    def _load_providers(self) -> None:
        """Initialise providers on first use (worker context only)."""
        if not self._providers_loaded:
            (
                self.analysis_provider,
                self.storyboard_provider,
                self.render_provider,
                self.assembly_provider,
            ) = make_providers(self.storage)
            self._providers_loaded = True

    async def create_job(
        self,
        session: AsyncSession,
        user: User,
        payload: CreateJobRequest,
    ) -> Job:
        job = Job(
            user_id=user.id,
            audio_file_name=payload.audio_file_name,
            audio_url=payload.audio_url,
            audio_duration_seconds=payload.audio_duration_seconds,
            style_preset_id=payload.style_preset_id,
            user_notes=payload.user_notes,
            cost_cap_usd=payload.cost_cap_usd or self.settings.cost_cap_usd_default,
            status="queued",
            current_stage="analysis",
        )
        session.add(job)
        await session.commit()
        await session.refresh(job)

        from app.workers.celery_app import celery_app
        celery_app.send_task("jobs.analyse_and_plan", args=[str(job.id)])
        return job

    async def list_jobs(self, session: AsyncSession, user: User) -> list[Job]:
        result = await session.scalars(
            select(Job)
            .where(Job.user_id == user.id)
            .options(selectinload(Job.scenes))
            .order_by(Job.created_at.desc())
        )
        return list(result)

    async def get_job(self, session: AsyncSession, user: User, job_id: str) -> Job:
        job = await session.scalar(
            select(Job)
            .where(Job.id == job_id, Job.user_id == user.id)
            .options(selectinload(Job.scenes), selectinload(Job.beat_map))
        )
        if not job:
            raise ValueError("Job not found")
        return job

    async def run_analysis_and_planning(self, session: AsyncSession, job_id: str) -> Job:
        self._load_providers()
        job = await session.scalar(select(Job).where(Job.id == job_id).options(selectinload(Job.scenes)))
        if not job:
            raise ValueError("Job not found")

        job.status = "analysing"
        job.current_stage = "analysis"
        job.started_at = datetime.now(UTC)
        await progress_broker.publish(
            ProgressEvent(job_id=job.id, stage="analysis", percent=10, message="Analysing audio")
        )

        analysis = await self.analysis_provider.analyze(job.audio_url, job.audio_duration_seconds)
        job.audio_analysis = analysis
        # Update job metadata from intelligence
        job.mood = analysis.get("mood")
        job.genre = analysis.get("genre")

        beat_map = await session.scalar(select(AudioBeatMap).where(AudioBeatMap.job_id == job.id))
        if not beat_map:
            beat_map = AudioBeatMap(
                job_id=job.id,
                bpm=analysis["bpm"],
                beat_times=analysis["beats"],
                bar_times=analysis["beats"][::4] if len(analysis["beats"]) >= 4 else analysis["beats"],
                downbeat_times=analysis["beats"][::4] if len(analysis["beats"]) >= 4 else analysis["beats"],
                onset_times=analysis.get("onsets", []),
            )
            session.add(beat_map)
        else:
            beat_map.bpm = analysis["bpm"]
            beat_map.beat_times = analysis["beats"]
            beat_map.onset_times = analysis.get("onsets", [])

        job.status = "planning"
        job.current_stage = "planning"
        await progress_broker.publish(
            ProgressEvent(job_id=job.id, stage="planning", percent=35, message="Generating storyboard")
        )

        storyboard = await self.storyboard_provider.generate(analysis, job.audio_duration_seconds)
        job.storyboard = storyboard.model_dump(mode="json")
        job.estimated_cost_usd = Decimal(str(max(1, len(storyboard.scenes)) * 0.15 + 0.12))
        job.scenes_total = len(storyboard.scenes)

        for existing_scene in list(job.scenes):
            await session.delete(existing_scene)

        for scene_data in storyboard.scenes:
            session.add(
                Scene(
                    job_id=job.id,
                    scene_index=scene_data.scene_index,
                    start_time_seconds=scene_data.start_time_seconds,
                    end_time_seconds=scene_data.end_time_seconds,
                    duration_seconds=scene_data.duration_seconds,
                    visual_prompt=scene_data.visual_description,
                    motion_type=scene_data.motion_type.value,
                    lighting_style=scene_data.lighting_style.value,
                    color_palette=scene_data.color_palette,
                    mood=scene_data.mood.value,
                    camera_angle=scene_data.camera_angle.value,
                    beat_importance_score=scene_data.beat_importance_score,
                    bar_start_beat_index=scene_data.bar_start_beat_index,
                    bar_end_beat_index=scene_data.bar_end_beat_index,
                    status="pending",
                )
            )

        job.status = "awaiting_approval"
        job.current_stage = "approval"
        await session.commit()
        return await self.get_job_by_id(session, job.id)

    async def approve_storyboard(self, session: AsyncSession, user: User, job_id: str) -> Job:
        job = await self.get_job(session, user, job_id)
        if job.status != "awaiting_approval":
            raise ValueError("Job is not awaiting approval")

        job.storyboard_approved = True
        job.storyboard_approved_at = datetime.now(UTC)
        job.status = "rendering"
        job.current_stage = "rendering"
        await session.commit()

        from app.workers.celery_app import celery_app
        celery_app.send_task("jobs.render", args=[job.id])
        return job

    async def reject_storyboard(
        self,
        session: AsyncSession,
        user: User,
        job_id: str,
        payload: RejectStoryboardRequest,
    ) -> Job:
        job = await self.get_job(session, user, job_id)
        if job.status != "awaiting_approval":
            raise ValueError("Job is not awaiting approval")
        job.storyboard_rejection_reason = payload.reason
        job.storyboard_regeneration_count += 1
        await session.commit()

        from app.workers.celery_app import celery_app
        celery_app.send_task("jobs.analyse_and_plan", args=[job.id])
        return job

    async def retry_scene(
        self,
        session: AsyncSession,
        user: User,
        job_id: str,
        scene_index: int,
        reason: str | None = None,
    ) -> Job:
        job = await self.get_job(session, user, job_id)
        scene = await session.scalar(
            select(Scene).where(Scene.job_id == job.id, Scene.scene_index == scene_index)
        )
        if not scene:
            raise ValueError("Scene not found")

        scene.status = "pending"
        scene.regeneration_count += 1
        scene.regeneration_reason = reason
        job.status = "rendering"
        job.current_stage = "rendering"
        await session.commit()

        from app.workers.celery_app import celery_app
        celery_app.send_task("jobs.render", args=[job.id, [scene_index]])
        return job

    async def render_job(
        self,
        session: AsyncSession,
        job_id: str,
        scene_indexes: list[int] | None = None,
    ) -> Job:
        self._load_providers()
        job = await self.get_job_by_id(session, job_id)
        ordered_scenes = sorted(job.scenes, key=lambda item: item.scene_index)
        targets = [scene for scene in ordered_scenes if scene_indexes is None or scene.scene_index in scene_indexes]

        completed_scenes = 0
        for scene in targets:
            result = await self.render_provider.render_scene(job.id, scene.scene_index, scene.visual_prompt)
            scene.status = "complete"
            scene.video_url = result.video_url
            scene.video_model_used = result.model_name
            scene.cost_usd = Decimal(str(result.cost_usd))
            scene.render_time_seconds = result.render_time_seconds
            completed_scenes += 1

            job.scenes_completed = len([item for item in ordered_scenes if item.status == "complete"])
            job.actual_cost_usd = Decimal(
                str(sum(float(item.cost_usd or 0) for item in ordered_scenes if item.cost_usd is not None))
            )
            percent = min(90, 40 + int((job.scenes_completed / max(1, job.scenes_total)) * 40))
            await progress_broker.publish(
                ProgressEvent(
                    job_id=job.id,
                    stage="rendering",
                    percent=percent,
                    scenes_complete=job.scenes_completed,
                    scenes_total=job.scenes_total,
                    message=f"Rendered scene {scene.scene_index + 1}",
                )
            )

            if job.scenes_completed >= self.settings.preview_scene_threshold and not job.preview_video_url:
                job.preview_video_url = await self.storage.write_bytes(
                    f"renders/{job.id}/preview.mp4",
                    b"VIGEN preview placeholder",
                )

        if all(scene.status == "complete" for scene in ordered_scenes):
            job.status = "assembling"
            job.current_stage = "assembly"
            await progress_broker.publish(
                ProgressEvent(
                    job_id=job.id,
                    stage="assembly",
                    percent=95,
                    scenes_complete=job.scenes_completed,
                    scenes_total=job.scenes_total,
                    message="Assembling final video",
                )
            )
            # 5. Assemble final video
            scene_urls = [s.video_url for s in ordered_scenes if s.video_url]
            job.final_video_url = await self.assembly_provider.assemble(
                job.id, scene_urls, job.audio_url
            )
            
            job.final_video_duration_seconds = job.audio_duration_seconds
            job.status = "complete"
            job.current_stage = "done"
            job.completed_at = datetime.now(UTC)
            if job.user:
                await self.notifications.send_job_complete_email(job.user.email, job.id, job.final_video_url)
            await progress_broker.publish(
                ProgressEvent(
                    job_id=job.id,
                    stage="done",
                    percent=100,
                    scenes_complete=job.scenes_completed,
                    scenes_total=job.scenes_total,
                    message="Video complete",
                )
            )
        await session.commit()
        return await self.get_job_by_id(session, job.id)

    async def get_job_by_id(self, session: AsyncSession, job_id: str) -> Job:
        job = await session.scalar(
            select(Job)
            .where(Job.id == job_id)
            .options(selectinload(Job.scenes), selectinload(Job.user))
        )
        if not job:
            raise ValueError("Job not found")
        return job
