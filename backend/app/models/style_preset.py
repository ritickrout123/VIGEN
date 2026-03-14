from sqlalchemy import Boolean, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class StylePreset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "style_presets"

    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt_modifier: Mapped[str] = mapped_column(Text)
    color_palette: Mapped[list[str]] = mapped_column(JSON, default=list)
    motion_bias: Mapped[str | None] = mapped_column(String(50), nullable=True)
    lighting_bias: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sample_video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
