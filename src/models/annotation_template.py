"""HOOPS AI - Annotation Template Model (reusable drawing presets for coaches)"""
from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.utils.database import Base
from src.models.base import TimestampMixin, JSONText


class AnnotationTemplate(Base, TimestampMixin):
    __tablename__ = "annotation_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    coach_id: Mapped[int] = mapped_column(Integer, ForeignKey("coaches.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # JSON array of annotation dicts:
    # [{annotation_type, stroke_data, color, stroke_width, text_content, time_offset}]
    annotations_data: Mapped[list] = mapped_column(JSONText, nullable=False)
