"""HOOPS AI - Region Model (hierarchical geographic regions)"""
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class Region(Base, TimestampMixin):
    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="Israel")
    parent_region_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("regions.id"), nullable=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="area")  # country, state, area

    # Relationships
    parent = relationship("Region", remote_side="Region.id", foreign_keys=[parent_region_id])
