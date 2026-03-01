"""HOOPS AI - Annotation Service (extracted from ScoutingService)

Handles video annotation CRUD (telestrator strokes).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.scouting_repository import AnnotationRepository
from src.models.video_annotation import VideoAnnotation


class AnnotationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.annotation_repo = AnnotationRepository(session)

    async def save_annotation(self, video_id: int, coach_id: int, data: dict) -> VideoAnnotation:
        ann = VideoAnnotation(
            video_id=video_id,
            clip_id=data.get("clip_id"),
            coach_id=coach_id,
            annotation_type=data["annotation_type"],
            timestamp=data["timestamp"],
            duration=data.get("duration", 3.0),
            stroke_data=data.get("stroke_data"),
            color=data.get("color", "#FF0000"),
            stroke_width=data.get("stroke_width", 3),
            text_content=data.get("text_content"),
        )
        self.session.add(ann)
        await self.session.flush()
        return ann

    async def get_annotations(self, video_id: int) -> list:
        return await self.annotation_repo.get_by_video(video_id)

    async def update_annotation(self, ann_id: int, coach_id: int, data: dict) -> VideoAnnotation | None:
        ann = await self.annotation_repo.get_by_id(ann_id)
        if not ann or ann.coach_id != coach_id:
            return None
        for key in ["annotation_type", "timestamp", "duration", "stroke_data",
                     "color", "stroke_width", "text_content"]:
            if key in data:
                setattr(ann, key, data[key])
        await self.session.flush()
        return ann

    async def delete_annotation(self, ann_id: int, coach_id: int) -> bool:
        ann = await self.annotation_repo.get_by_id(ann_id)
        if not ann or ann.coach_id != coach_id:
            return False
        await self.annotation_repo.delete(ann_id)
        return True
