"""HOOPS AI - Clip Service (extracted from ScoutingService)

Handles clip CRUD and player tagging.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.repositories.scouting_repository import (
    ScoutingVideoRepository, VideoClipRepository,
)
from src.models.video_clip import VideoClip
from src.models.clip_player_tag import ClipPlayerTag
from src.models.scouting_video import ScoutingVideo
from src.utils.exceptions import NotFoundError


class ClipService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.video_repo = ScoutingVideoRepository(session)
        self.clip_repo = VideoClipRepository(session)

    async def create_clip(self, video_id: int, coach_id: int, data: dict,
                          notify_callback=None) -> VideoClip:
        """Create a clip. If player_ids provided and notify_callback given, calls it."""
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            raise NotFoundError("Video")

        clip = VideoClip(
            video_id=video_id,
            coach_id=coach_id,
            title=data.get("title"),
            start_time=data["start_time"],
            end_time=data["end_time"],
            action_type=data.get("action_type", "other"),
            rating=data.get("rating"),
            notes=data.get("notes"),
        )
        self.session.add(clip)
        await self.session.flush()

        # Add player tags
        player_ids = data.get("player_ids", [])
        for pid in player_ids:
            tag = ClipPlayerTag(clip_id=clip.id, player_id=pid)
            self.session.add(tag)

        if player_ids:
            await self.session.flush()
            # Notify tagged players via callback (avoids circular imports)
            if notify_callback:
                await notify_callback(clip, video, player_ids)

        # Reload with relationships to avoid MissingGreenlet in serializer
        reloaded = await self.clip_repo.get_by_id_with_relations(clip.id)
        return reloaded or clip

    async def get_clips(self, video_id: int) -> list:
        return await self.clip_repo.get_by_video(video_id)

    async def update_clip(self, clip_id: int, coach_id: int, data: dict) -> VideoClip | None:
        clip = await self.clip_repo.get_by_id(clip_id)
        if not clip or clip.coach_id != coach_id:
            return None
        for key in ["title", "action_type", "rating", "notes"]:
            if key in data:
                setattr(clip, key, data[key])
        await self.session.flush()
        return clip

    async def delete_clip(self, clip_id: int, coach_id: int) -> bool:
        clip = await self.clip_repo.get_by_id(clip_id)
        if not clip or clip.coach_id != coach_id:
            return False
        await self.clip_repo.delete(clip_id)
        return True

    async def add_player_tag(self, clip_id: int, coach_id: int, player_id: int,
                             notify_callback=None) -> bool:
        clip = await self.clip_repo.get_by_id(clip_id)
        if not clip or clip.coach_id != coach_id:
            return False
        tag = ClipPlayerTag(clip_id=clip_id, player_id=player_id)
        self.session.add(tag)
        try:
            await self.session.flush()
        except Exception:
            return False  # Duplicate

        if notify_callback:
            video = await self.video_repo.get_by_id(clip.video_id)
            await notify_callback(clip, video, [player_id])
        return True

    async def remove_player_tag(self, clip_id: int, coach_id: int, player_id: int) -> bool:
        clip = await self.clip_repo.get_by_id(clip_id)
        if not clip or clip.coach_id != coach_id:
            return False
        stmt = select(ClipPlayerTag).where(
            ClipPlayerTag.clip_id == clip_id, ClipPlayerTag.player_id == player_id
        )
        result = await self.session.execute(stmt)
        tag = result.scalar_one_or_none()
        if tag:
            await self.session.delete(tag)
            await self.session.flush()
        return True
