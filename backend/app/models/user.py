from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(String(50), default="local")
    auth_provider_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_picture_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role: Mapped[str] = mapped_column(String(50), default="user")
    api_key_hash: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    credits_balance: Mapped[int] = mapped_column(Integer, default=0)
    total_credits_purchased: Mapped[int] = mapped_column(Integer, default=0)
    total_videos_generated: Mapped[int] = mapped_column(Integer, default=0)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email_verification_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    jobs = relationship("Job", back_populates="user", cascade="all, delete-orphan")
    credit_transactions = relationship(
        "CreditTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )
