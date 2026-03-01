"""HOOPS AI - OneTimeCharge (event/equipment/tournament fee per player)"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, Numeric, Text, Date, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class OneTimeCharge(Base, TimestampMixin):
    __tablename__ = "one_time_charges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    player_id: Mapped[int] = mapped_column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    created_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    due_date: Mapped[str | None] = mapped_column(Date, nullable=True)

    # status: "pending", "paid", "overdue", "cancelled"
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)

    paid_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    marked_by_admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    admin_acknowledged: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, server_default=text("true"))

    # Relationships
    player = relationship("Player", foreign_keys=[player_id])
    team = relationship("Team", foreign_keys=[team_id])
    created_by = relationship("User", foreign_keys=[created_by_admin_id])
    marked_by = relationship("User", foreign_keys=[marked_by_admin_id])
