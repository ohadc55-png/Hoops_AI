"""HOOPS AI - Team Storage Quota Model"""
from sqlalchemy import Integer, BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.utils.database import Base
from src.models.base import TimestampMixin


class TeamStorageQuota(Base, TimestampMixin):
    __tablename__ = "team_storage_quotas"
    __table_args__ = (UniqueConstraint("team_id", name="uq_team_quota"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    storage_used_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    storage_limit_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=53687091200)  # 50GB
    video_ttl_days: Mapped[int] = mapped_column(Integer, nullable=False, default=365)

    team = relationship("Team", foreign_keys=[team_id])
