from sqlalchemy import Float, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class Scene(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "scenes"

    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    scene_index: Mapped[int] = mapped_column(Integer)
    start_time_seconds: Mapped[float] = mapped_column(Float)
    end_time_seconds: Mapped[float] = mapped_column(Float)
    duration_seconds: Mapped[float] = mapped_column(Float)
    visual_prompt: Mapped[str] = mapped_column(Text)
    motion_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lighting_style: Mapped[str | None] = mapped_column(String(100), nullable=True)
    color_palette: Mapped[list[str]] = mapped_column(JSON, default=list)
    mood: Mapped[str | None] = mapped_column(String(50), nullable=True)
    camera_angle: Mapped[str | None] = mapped_column(String(50), nullable=True)
    beat_importance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    bar_start_beat_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bar_end_beat_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    video_model_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    render_time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    regeneration_count: Mapped[int] = mapped_column(Integer, default=0)
    regeneration_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    job = relationship("Job", back_populates="scenes")
