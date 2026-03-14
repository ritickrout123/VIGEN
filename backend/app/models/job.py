from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class Job(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "jobs"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    audio_file_name: Mapped[str] = mapped_column(String(255))
    audio_url: Mapped[str] = mapped_column(Text)
    audio_duration_seconds: Mapped[float] = mapped_column(Float)
    audio_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", index=True)
    current_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    style_preset_id: Mapped[str | None] = mapped_column(
        ForeignKey("style_presets.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_template_version: Mapped[str] = mapped_column(String(50), default="1.0")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    actual_cost_usd: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    cost_cap_usd: Mapped[float] = mapped_column(Numeric(10, 4), default=20.0)
    audio_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    storyboard: Mapped[dict] = mapped_column(JSON, default=dict)
    storyboard_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    storyboard_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    storyboard_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    storyboard_regeneration_count: Mapped[int] = mapped_column(Integer, default=0)
    scenes_total: Mapped[int] = mapped_column(Integer, default=0)
    scenes_completed: Mapped[int] = mapped_column(Integer, default=0)
    scenes_failed: Mapped[int] = mapped_column(Integer, default=0)
    final_video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_video_duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_video_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preview_video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="jobs")
    scenes = relationship("Scene", back_populates="job", cascade="all, delete-orphan")
    beat_map = relationship(
        "AudioBeatMap",
        back_populates="job",
        uselist=False,
        cascade="all, delete-orphan",
    )
