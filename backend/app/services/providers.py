from dataclasses import dataclass
from math import ceil

from app.schemas.storyboard import (
    CameraAngle,
    LightingStyle,
    Mood,
    MotionType,
    StoryboardSchema,
)


@dataclass
class RenderResult:
    video_url: str
    model_name: str
    cost_usd: float
    render_time_seconds: float


class AudioAnalysisProvider:
    async def analyze(self, audio_url: str, duration_seconds: float) -> dict:
        scene_count = max(1, min(30, ceil(duration_seconds / 5)))
        beats = [round(index * 0.5, 2) for index in range(int(duration_seconds * 2))]
        return {
            "bpm": 120.0,
            "beats": beats,
            "mood": "energetic",
            "energy_arc": [
                {"time": 0, "label": "intro", "energy": 0.45},
                {"time": round(duration_seconds / 2, 2), "label": "lift", "energy": 0.8},
                {"time": duration_seconds, "label": "resolve", "energy": 0.6},
            ],
            "key": "C Minor",
            "genre": "electronic",
            "scene_count_hint": scene_count,
            "audio_url": audio_url,
        }


class StoryboardProvider:
    async def generate(self, analysis: dict, duration_seconds: float) -> StoryboardSchema:
        scene_count = max(1, min(30, int(analysis.get("scene_count_hint", ceil(duration_seconds / 5)))))
        scene_duration = round(duration_seconds / scene_count, 2)
        scenes = []
        for index in range(scene_count):
            start = round(index * scene_duration, 2)
            end = round(duration_seconds if index == scene_count - 1 else (index + 1) * scene_duration, 2)
            duration = round(end - start, 2)
            scenes.append(
                {
                    "scene_index": index,
                    "start_time_seconds": start,
                    "end_time_seconds": end,
                    "duration_seconds": duration,
                    "visual_description": (
                        f"Cinematic music video scene {index + 1} with neon atmosphere, "
                        "dynamic camera motion, and emotionally synchronized imagery."
                    ),
                    "motion_type": MotionType.DOLLY.value if index % 2 == 0 else MotionType.PAN.value,
                    "lighting_style": LightingStyle.CINEMATIC.value,
                    "color_palette": ["#0F172A", "#F97316", "#F8FAFC"],
                    "mood": Mood.ENERGETIC.value,
                    "camera_angle": CameraAngle.WIDE.value,
                    "beat_importance_score": 0.7,
                    "bar_start_beat_index": index * 4,
                    "bar_end_beat_index": (index + 1) * 4,
                    "transition_type": "cut",
                }
            )
        return StoryboardSchema(
            scenes=scenes,
            total_duration_seconds=duration_seconds,
            dominant_mood=Mood.ENERGETIC.value,
            narrative_arc=(
                "A performance-driven visual journey that starts restrained, expands into "
                "stylized movement, and resolves with a confident cinematic finish."
            ),
            quality_score=8.2,
        )


class VideoRenderProvider:
    def __init__(self, storage_service) -> None:
        self.storage_service = storage_service

    async def render_scene(self, job_id: str, scene_index: int, prompt: str) -> RenderResult:
        fake_video_bytes = (
            f"VIGEN mock render\njob={job_id}\nscene={scene_index}\nprompt={prompt}\n".encode("utf-8")
        )
        video_url = self.storage_service.write_bytes(
            f"renders/{job_id}/scene-{scene_index:03d}.mp4",
            fake_video_bytes,
        )
        return RenderResult(
            video_url=video_url,
            model_name="mock-kling",
            cost_usd=0.15,
            render_time_seconds=2.5,
        )

