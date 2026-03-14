from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class CreditTransaction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "credit_transactions"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[str | None] = mapped_column(ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    transaction_type: Mapped[str] = mapped_column(String(50))
    amount_credits: Mapped[int] = mapped_column(Integer)
    amount_usd: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    balance_before: Mapped[int] = mapped_column(Integer)
    balance_after: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    user = relationship("User", back_populates="credit_transactions")
