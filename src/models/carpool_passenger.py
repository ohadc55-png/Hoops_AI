"""HOOPS AI - Carpool Passenger (parent joins a ride)"""
from sqlalchemy import Integer, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class CarpoolPassenger(Base, TimestampMixin):
    __tablename__ = "carpool_passengers"
    __table_args__ = (
        UniqueConstraint("ride_id", "passenger_user_id", name="uq_ride_passenger"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ride_id: Mapped[int] = mapped_column(Integer, ForeignKey("carpool_rides.id"), nullable=False, index=True)
    passenger_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    player_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("players.id"), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    ride = relationship("CarpoolRide", back_populates="passengers")
    passenger = relationship("User", foreign_keys=[passenger_user_id])
    player = relationship("Player", foreign_keys=[player_id])
