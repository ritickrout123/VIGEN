from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.job import (
    ApproveStoryboardResponse,
    CreateJobRequest,
    JobListItem,
    JobResponse,
    RejectStoryboardRequest,
)
from app.schemas.scene import RetrySceneRequest, SceneResponse
from app.services.jobs import JobService
from app.services.progress import progress_broker


router = APIRouter()


def serialize_job(job) -> JobResponse:
    return JobResponse(
        id=job.id,
        created_at=job.created_at,
        updated_at=job.updated_at,
        user_id=job.user_id,
        audio_file_name=job.audio_file_name,
        status=job.status,
        current_stage=job.current_stage,
        scenes_total=job.scenes_total,
        scenes_completed=job.scenes_completed,
        final_video_url=job.final_video_url,
        preview_video_url=job.preview_video_url,
        thumbnail_url=job.thumbnail_url,
        audio_duration_seconds=job.audio_duration_seconds,
        audio_url=job.audio_url,
        prompt_template_version=job.prompt_template_version,
        storyboard_approved=job.storyboard_approved,
        storyboard_approved_at=job.storyboard_approved_at,
        storyboard_rejection_reason=job.storyboard_rejection_reason,
        storyboard_regeneration_count=job.storyboard_regeneration_count,
        estimated_cost_usd=float(job.estimated_cost_usd) if job.estimated_cost_usd is not None else None,
        actual_cost_usd=float(job.actual_cost_usd) if job.actual_cost_usd is not None else None,
        cost_cap_usd=float(job.cost_cap_usd),
        audio_analysis=job.audio_analysis or {},
        storyboard=job.storyboard or {},
        failure_reason=job.failure_reason,
        completed_at=job.completed_at,
        scenes_failed=job.scenes_failed,
        scenes=[SceneResponse.model_validate(scene) for scene in sorted(job.scenes, key=lambda item: item.scene_index)],
    )


@router.get("", response_model=list[JobListItem])
async def list_jobs(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[JobListItem]:
    jobs = await JobService().list_jobs(session, current_user)
    return [serialize_job(job) for job in jobs]


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: CreateJobRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    job = await JobService().create_job(session, current_user, payload)
    return serialize_job(job)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    try:
        job = await JobService().get_job(session, current_user, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return serialize_job(job)


@router.get("/{job_id}/scenes", response_model=list[SceneResponse])
async def get_job_scenes(
    job_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SceneResponse]:
    job = await JobService().get_job(session, current_user, job_id)
    return [SceneResponse.model_validate(scene) for scene in sorted(job.scenes, key=lambda item: item.scene_index)]


@router.post("/{job_id}/approve", response_model=ApproveStoryboardResponse)
async def approve_storyboard(
    job_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApproveStoryboardResponse:
    try:
        job = await JobService().approve_storyboard(session, current_user, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ApproveStoryboardResponse(
        job_id=job.id,
        status=job.status,
        storyboard_approved=job.storyboard_approved,
    )


@router.post("/{job_id}/reject", response_model=JobResponse)
async def reject_storyboard(
    job_id: str,
    payload: RejectStoryboardRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    try:
        job = await JobService().reject_storyboard(session, current_user, job_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return serialize_job(job)


@router.post("/{job_id}/scenes/{scene_index}/retry", response_model=JobResponse)
async def retry_scene(
    job_id: str,
    scene_index: int,
    payload: RetrySceneRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> JobResponse:
    try:
        job = await JobService().retry_scene(
            session,
            current_user,
            job_id,
            scene_index,
            payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return serialize_job(job)


@router.websocket("/{job_id}/ws")
async def job_progress(job_id: str, websocket: WebSocket) -> None:
    await progress_broker.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await progress_broker.disconnect(job_id, websocket)

