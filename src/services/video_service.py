"""HOOPS AI - Video Service (extracted from ScoutingService)

Handles video CRUD: register, get, update, delete, share/unshare.
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings
from src.repositories.scouting_repository import (
    ScoutingVideoRepository, StorageQuotaRepository,
)
from src.models.scouting_video import ScoutingVideo
from src.services.cloudinary_service import CloudinaryService
from src.utils.exceptions import ValidationError

settings = get_settings()


class VideoService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.video_repo = ScoutingVideoRepository(session)
        self.quota_repo = StorageQuotaRepository(session)
        self.cloudinary = CloudinaryService()

    async def register_video(self, coach_id: int, team_id: int | None, data: dict) -> ScoutingVideo:
        """Register a video after successful Cloudinary upload from browser."""
        file_size = data.get("file_size", 0)

        # Check quota if team assigned
        if team_id:
            quota = await self.quota_repo.get_or_create(team_id)
            if quota.storage_used_bytes + file_size > quota.storage_limit_bytes:
                raise ValidationError("Storage quota exceeded for this team")

        # Build HLS + thumbnail URLs from public_id
        public_id = data["cloudinary_public_id"]
        hls_url = self.cloudinary.get_hls_url(public_id)
        thumbnail_url = self.cloudinary.get_thumbnail_url(public_id)

        keep_forever = data.get("keep_forever", False)
        if keep_forever:
            expires_at = None
        else:
            ttl_days = settings.SCOUTING_VIDEO_TTL_DAYS
            expires_at = datetime.utcnow() + timedelta(days=ttl_days)

        video = ScoutingVideo(
            coach_id=coach_id,
            team_id=team_id,
            title=data.get("title", "Untitled Video"),
            description=data.get("description"),
            video_type=data.get("video_type", "game"),
            cloudinary_public_id=public_id,
            cloudinary_url=data.get("cloudinary_url", ""),
            cloudinary_hls_url=hls_url,
            thumbnail_url=thumbnail_url,
            original_name=data.get("original_name", ""),
            file_size=file_size,
            duration_seconds=data.get("duration_seconds"),
            opponent=data.get("opponent"),
            game_date=data.get("game_date"),
            expires_at=expires_at,
            keep_forever=keep_forever,
        )
        self.session.add(video)
        await self.session.flush()

        # Update quota
        if team_id:
            await self.quota_repo.update_usage(team_id, file_size)

        return video

    async def get_videos(self, coach_id: int, video_type: str | None = None,
                         team_id: int | None = None, search: str | None = None) -> list:
        return await self.video_repo.get_by_coach(coach_id, video_type, team_id, search)

    async def get_video_detail(self, video_id: int) -> ScoutingVideo | None:
        return await self.video_repo.get_with_clips(video_id)

    async def update_video(self, video_id: int, coach_id: int, data: dict) -> ScoutingVideo | None:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return None
        for key in ["title", "description", "video_type", "opponent", "game_date"]:
            if key in data:
                setattr(video, key, data[key])
        # Handle keep_forever toggle
        if "keep_forever" in data:
            kf = data["keep_forever"]
            video.keep_forever = kf
            if kf:
                video.expires_at = None
                video.expiry_notified_48h = False
                video.expiry_notified_6h = False
            else:
                ttl_days = settings.SCOUTING_VIDEO_TTL_DAYS
                video.expires_at = datetime.utcnow() + timedelta(days=ttl_days)
                video.expiry_notified_48h = False
                video.expiry_notified_6h = False
        await self.session.flush()
        return video

    async def delete_video(self, video_id: int, coach_id: int) -> bool:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return False

        # Delete from Cloudinary
        self.cloudinary.delete_video(video.cloudinary_public_id)

        # Update quota
        if video.team_id and video.file_size:
            await self.quota_repo.update_usage(video.team_id, -video.file_size)

        await self.video_repo.delete(video_id)
        return True

    async def share_video(self, video_id: int, coach_id: int, team_id: int) -> bool:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return False
        video.shared_with_team = True
        video.team_id = team_id
        await self.session.flush()
        return True

    async def unshare_video(self, video_id: int, coach_id: int) -> bool:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return False
        video.shared_with_team = False
        await self.session.flush()
        return True

    async def share_video_with_parents(self, video_id: int, coach_id: int) -> bool:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return False
        video.shared_with_parents = True
        await self.session.flush()
        return True

    async def unshare_video_with_parents(self, video_id: int, coach_id: int) -> bool:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            return False
        video.shared_with_parents = False
        await self.session.flush()
        return True
