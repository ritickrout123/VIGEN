from sqlalchemy import Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class AudioBeatMap(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "audio_beat_maps"

    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), unique=True)
    bpm: Mapped[float] = mapped_column(Float)
    beat_times: Mapped[list[float]] = mapped_column(JSON, default=list)
    bar_times: Mapped[list[float]] = mapped_column(JSON, default=list)
    downbeat_times: Mapped[list[float]] = mapped_column(JSON, default=list)
    onset_times: Mapped[list[float]] = mapped_column(JSON, default=list)

    job = relationship("Job", back_populates="beat_map")
