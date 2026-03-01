"""HOOPS AI - Admin Role Model"""
from sqlalchemy import String, Integer, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class AdminRole(Base, TimestampMixin):
    __tablename__ = "admin_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # permissions: {"allowed_pages": [...]} or None = unrestricted (super-admin)
    permissions: Mapped[dict | None] = mapped_column(JSONText, nullable=True)
