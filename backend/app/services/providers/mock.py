"""
Mock providers for DEMO_MODE.

Each provider simulates realistic async delays and returns structured fake data
so the full Celery pipeline can complete end-to-end without any real API keys.
"""

import asyncio
import logging
from math import ceil

from app.schemas.storyboard import (
    CameraAngle,
    LightingStyle,
    Mood,
    MotionType,
    StoryboardSchema,
)
from app.services.providers.real import RenderResult

logger = logging.getLogger(__name__)


class MockAudioAnalysisProvider:
    """Returns deterministic fake analysis data with a short simulated delay."""

    async def analyze(self, audio_url: str, duration_seconds: float) -> dict:
        logger.info("[DEMO] MockAudioAnalysisProvider.analyze — skipping real librosa/Gemini")
        await asyncio.sleep(1.5)  # simulate processing time

        bpm = 128.0
        beat_interval = 60.0 / bpm
        beat_times = [round(i * beat_interval, 3) for i in range(int(duration_seconds / beat_interval))]
        onset_times = beat_times[::2]  # every other beat

        energy_arc = [
            {"time": 0.0, "label": "intro", "energy": 0.3},
            {"time": round(duration_seconds / 2, 2), "label": "lift", "energy": 0.75},
            {"time": round(duration_seconds, 2), "label": "resolve", "energy": 0.5},
        ]

        scene_count = max(1, min(30, ceil(duration_seconds / 5)))

        return {
            "bpm": bpm,
            "beats": beat_times,
            "onsets": onset_times,
            "mood": "energetic",
            "genre": "synthwave",
            "key": "C Minor",
            "energy_arc": energy_arc,
            "scene_count_hint": scene_count,
            "audio_url": audio_url,
        }


class MockStoryboardProvider:
    """Returns a valid StoryboardSchema with a short simulated delay."""

    async def generate(
        self,
        analysis: dict,
        duration_seconds: float,
        preset=None,
        rejection_reason: str | None = None,
    ) -> StoryboardSchema:
        logger.info("[DEMO] MockStoryboardProvider.generate — skipping real Claude call")
        if rejection_reason:
            logger.info(f"[DEMO] Incorporating rejection reason: {rejection_reason}")
        await asyncio.sleep(2.0)  # simulate LLM latency

        scene_count = max(1, min(30, int(analysis.get("scene_count_hint", ceil(duration_seconds / 5)))))
        scene_duration = round(duration_seconds / scene_count, 2)

        scenes = []
        for i in range(scene_count):
            start = round(i * scene_duration, 2)
            end = round(duration_seconds if i == scene_count - 1 else (i + 1) * scene_duration, 2)
            dur = round(end - start, 2)
            scenes.append(
                {
                    "scene_index": i,
                    "start_time_seconds": start,
                    "end_time_seconds": end,
                    "duration_seconds": dur,
                    "visual_description": (
                        f"[DEMO] Scene {i + 1}: Neon-lit cityscape with dynamic camera motion, "
                        "synthwave aesthetic, and beat-synchronized light pulses filling the frame."
                    ),
                    "motion_type": MotionType.DOLLY,
                    "lighting_style": LightingStyle.NEON,
                    "color_palette": ["#0F172A", "#F97316", "#F8FAFC"],
                    "mood": Mood.ENERGETIC,
                    "camera_angle": CameraAngle.WIDE,
                    "beat_importance_score": 0.8,
                    "bar_start_beat_index": i * 4,
                    "bar_end_beat_index": (i + 1) * 4,
                    "transition_type": "cut",
                }
            )

        return StoryboardSchema(
            scenes=scenes,
            total_duration_seconds=duration_seconds,
            dominant_mood=Mood.ENERGETIC,
            narrative_arc=(
                "[DEMO] A journey through a neon-drenched synthwave cityscape, "
                "building from a quiet intro through an electrifying lift to a cinematic resolve. "
                "Each scene pulses with the beat, creating a hypnotic visual rhythm."
            ),
            quality_score=8.5,
        )


class MockVideoRenderProvider:
    """Simulates a Kling render by writing a copy of the sample fixture clip."""

    def __init__(self, storage_service) -> None:
        self.storage = storage_service

    async def render_scene(
        self, job_id: str, scene_index: int, prompt: str, duration_seconds: float = 5.0
    ) -> RenderResult:
        logger.info(f"[DEMO] MockVideoRenderProvider.render_scene — scene {scene_index}")
        await asyncio.sleep(2.0)  # simulate render latency

        # Use the sample fixture clip if available, otherwise write placeholder bytes
        from pathlib import Path

        # mock.py lives at backend/app/services/providers/mock.py
        # parents[4] = project root, then backend/fixtures/sample_clip.mp4
        fixture_path = Path(__file__).parents[4] / "backend" / "fixtures" / "sample_clip.mp4"
        if fixture_path.exists():
            clip_bytes = fixture_path.read_bytes()
        else:
            # Minimal valid-looking placeholder
            clip_bytes = b"VIGEN_DEMO_CLIP\x00" * 64

        video_url = await self.storage.write_bytes(
            f"renders/{job_id}/scene-{scene_index:03d}.mp4",
            clip_bytes,
        )

        return RenderResult(
            video_url=video_url,
            model_name="mock-kling",
            cost_usd=0.15,
            render_time_seconds=2.0,
        )


class MockVideoAssemblyProvider:
    """Simulates FFmpeg assembly by concatenating placeholder bytes."""

    def __init__(self, storage_service) -> None:
        self.storage = storage_service

    async def assemble(
        self,
        job_id: str,
        scene_urls: list[str],
        audio_url: str,
        expected_duration: float = 0.0,
    ) -> str:
        logger.info(f"[DEMO] MockVideoAssemblyProvider.assemble — {len(scene_urls)} scenes")
        await asyncio.sleep(1.5)  # simulate assembly time

        # Write a placeholder final MP4
        placeholder = b"VIGEN_DEMO_FINAL\x00" * 128
        final_url = await self.storage.write_bytes(
            f"renders/{job_id}/final.mp4",
            placeholder,
        )
        return final_url
