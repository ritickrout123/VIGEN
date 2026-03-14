from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator


class MotionType(str, Enum):
    ZOOM = "zoom"
    PAN = "pan"
    STATIC = "static"
    DOLLY = "dolly"
    ROTATE = "rotate"
    TILT = "tilt"


class LightingStyle(str, Enum):
    CINEMATIC = "cinematic"
    NEON = "neon"
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    HARSH = "harsh"


class CameraAngle(str, Enum):
    WIDE = "wide"
    MEDIUM = "medium"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    OVERHEAD = "overhead"
    LOW_ANGLE = "low_angle"


class Mood(str, Enum):
    ENERGETIC = "energetic"
    CALM = "calm"
    DRAMATIC = "dramatic"
    PLAYFUL = "playful"
    MELANCHOLIC = "melancholic"
    AGGRESSIVE = "aggressive"
    ROMANTIC = "romantic"
    MYSTERIOUS = "mysterious"


class SceneSchema(BaseModel):
    scene_index: int = Field(ge=0)
    start_time_seconds: float = Field(ge=0)
    end_time_seconds: float = Field(gt=0)
    duration_seconds: float = Field(gt=0)
    visual_description: str = Field(min_length=20, max_length=500)
    motion_type: MotionType
    lighting_style: LightingStyle
    color_palette: list[str] = Field(min_length=2, max_length=5)
    mood: Mood
    camera_angle: CameraAngle
    beat_importance_score: float = Field(ge=0, le=1)
    bar_start_beat_index: int = Field(ge=0)
    bar_end_beat_index: int = Field(ge=0)
    transition_type: str | None = None

    @field_validator("color_palette")
    @classmethod
    def validate_hex_colors(cls, value: list[str]) -> list[str]:
        for color in value:
            if not (color.startswith("#") and len(color) == 7):
                raise ValueError("Color palette must contain hex colors")
        return value

    @model_validator(mode="after")
    def validate_durations(self) -> "SceneSchema":
        if self.end_time_seconds <= self.start_time_seconds:
            raise ValueError("end_time_seconds must be greater than start_time_seconds")
        expected_duration = round(self.end_time_seconds - self.start_time_seconds, 2)
        if abs(expected_duration - self.duration_seconds) > 0.1:
            raise ValueError("duration_seconds must equal end_time_seconds - start_time_seconds")
        return self


class StoryboardSchema(BaseModel):
    scenes: list[SceneSchema] = Field(min_length=1, max_length=30)
    total_duration_seconds: float = Field(gt=0)
    narrative_arc: str = Field(min_length=50, max_length=500)
    dominant_mood: Mood
    quality_score: float = Field(ge=0, le=10)

    @model_validator(mode="after")
    def validate_contiguous_scenes(self) -> "StoryboardSchema":
        ordered_scenes = sorted(self.scenes, key=lambda scene: scene.start_time_seconds)
        for index in range(len(ordered_scenes) - 1):
            current_scene = ordered_scenes[index]
            next_scene = ordered_scenes[index + 1]
            if abs(current_scene.end_time_seconds - next_scene.start_time_seconds) > 0.1:
                raise ValueError("Scenes must be contiguous")
        if abs(ordered_scenes[-1].end_time_seconds - self.total_duration_seconds) > 0.1:
            raise ValueError("total_duration_seconds must match final scene end time")
        return self

