from pydantic import BaseModel, Field

from app.schemas.common import TimestampedResponse


class SceneResponse(TimestampedResponse):
    job_id: str
    scene_index: int
    start_time_seconds: float
    end_time_seconds: float
    duration_seconds: float
    visual_prompt: str
    motion_type: str | None
    lighting_style: str | None
    color_palette: list[str]
    mood: str | None
    camera_angle: str | None
    beat_importance_score: float | None
    bar_start_beat_index: int | None
    bar_end_beat_index: int | None
    status: str
    video_model_used: str | None
    video_url: str | None
    cost_usd: float | None
    render_time_seconds: float | None
    regeneration_count: int


class RetrySceneRequest(BaseModel):
    job_id: str
    reason: str | None = Field(default=None, max_length=500)

