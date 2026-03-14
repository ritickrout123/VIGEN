from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import TimestampedResponse
from app.schemas.scene import SceneResponse


class AudioAnalysisSchema(BaseModel):
    bpm: float = 0
    beats: list[float] = Field(default_factory=list)
    mood: str = "unknown"
    energy_arc: list[dict[str, float | str]] = Field(default_factory=list)
    key: str | None = None
    genre: str | None = None


class CreateJobRequest(BaseModel):
    audio_file_name: str
    audio_url: str
    audio_duration_seconds: float = Field(gt=0)
    style_preset_id: str | None = None
    user_notes: str | None = None
    cost_cap_usd: float | None = None


class RejectStoryboardRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class JobListItem(TimestampedResponse):
    user_id: str
    audio_file_name: str
    status: str
    current_stage: str | None
    scenes_total: int
    scenes_completed: int
    final_video_url: str | None
    preview_video_url: str | None
    thumbnail_url: str | None


class JobResponse(JobListItem):
    audio_duration_seconds: float
    audio_url: str
    prompt_template_version: str
    storyboard_approved: bool
    storyboard_approved_at: datetime | None
    storyboard_rejection_reason: str | None
    storyboard_regeneration_count: int
    estimated_cost_usd: float | None
    actual_cost_usd: float | None
    cost_cap_usd: float
    audio_analysis: AudioAnalysisSchema
    storyboard: dict
    failure_reason: str | None
    completed_at: datetime | None
    scenes_failed: int
    scenes: list[SceneResponse] = Field(default_factory=list)


class ApproveStoryboardResponse(BaseModel):
    job_id: str
    status: str
    storyboard_approved: bool

