"""HOOPS AI - Scouting Repositories"""
from datetime import datetime
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.base_repository import BaseRepository
from src.models.scouting_video import ScoutingVideo
from src.models.video_clip import VideoClip
from src.models.video_annotation import VideoAnnotation
from src.models.clip_player_tag import ClipPlayerTag
from src.models.clip_view import ClipView
from src.models.team_storage_quota import TeamStorageQuota


class ScoutingVideoRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(ScoutingVideo, session)

    async def get_by_coach(self, coach_id: int, video_type: str | None = None,
                           team_id: int | None = None, search: str | None = None,
                           limit: int = 50) -> list:
        stmt = select(ScoutingVideo).where(ScoutingVideo.coach_id == coach_id)
        if video_type:
            stmt = stmt.where(ScoutingVideo.video_type == video_type)
        if team_id:
            stmt = stmt.where(ScoutingVideo.team_id == team_id)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                ScoutingVideo.title.ilike(pattern) | ScoutingVideo.opponent.ilike(pattern)
            )
        stmt = stmt.order_by(ScoutingVideo.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_with_clips(self, video_id: int) -> ScoutingVideo | None:
        stmt = (
            select(ScoutingVideo)
            .options(
                selectinload(ScoutingVideo.clips).selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player),
                selectinload(ScoutingVideo.clips).selectinload(VideoClip.views),
                selectinload(ScoutingVideo.annotations),
            )
            .where(ScoutingVideo.id == video_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_shared_for_teams(self, team_ids: list[int], limit: int = 50) -> list:
        stmt = (
            select(ScoutingVideo)
            .where(
                ScoutingVideo.shared_with_team == True,
                ScoutingVideo.team_id.in_(team_ids),
            )
            .order_by(ScoutingVideo.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_team_ids(self, team_ids: list[int], coach_ids: list[int] | None = None,
                              video_type: str | None = None,
                              search: str | None = None, limit: int = 100) -> list:
        """Admin: get all videos for given team IDs + coaches (includes team_id=NULL)."""
        if coach_ids:
            stmt = select(ScoutingVideo).where(
                or_(
                    ScoutingVideo.team_id.in_(team_ids),
                    ScoutingVideo.coach_id.in_(coach_ids),
                )
            )
        else:
            stmt = select(ScoutingVideo).where(ScoutingVideo.team_id.in_(team_ids))
        if video_type:
            stmt = stmt.where(ScoutingVideo.video_type == video_type)
        if search:
            pattern = f"%{search}%"
            stmt = stmt.where(
                ScoutingVideo.title.ilike(pattern) | ScoutingVideo.opponent.ilike(pattern)
            )
        stmt = stmt.order_by(ScoutingVideo.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_shared_with_parents_for_teams(self, team_ids: list[int], limit: int = 50) -> list:
        """Parent: get videos explicitly shared with parents for given teams."""
        stmt = (
            select(ScoutingVideo)
            .where(
                ScoutingVideo.shared_with_parents == True,
                ScoutingVideo.team_id.in_(team_ids),
            )
            .order_by(ScoutingVideo.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_expired(self, limit: int = 50) -> list:
        stmt = (
            select(ScoutingVideo)
            .where(
                ScoutingVideo.expires_at.isnot(None),
                ScoutingVideo.expires_at < datetime.utcnow(),
            )
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_expiring_within(self, hours: int, notified_field: str) -> list:
        """Get videos expiring within N hours that haven't been notified yet."""
        from datetime import timedelta
        now = datetime.utcnow()
        deadline = now + timedelta(hours=hours)
        conditions = [
            ScoutingVideo.expires_at.isnot(None),
            ScoutingVideo.expires_at > now,
            ScoutingVideo.expires_at <= deadline,
            ScoutingVideo.keep_forever == False,
        ]
        if notified_field == "48h":
            conditions.append(ScoutingVideo.expiry_notified_48h == False)
        elif notified_field == "6h":
            conditions.append(ScoutingVideo.expiry_notified_6h == False)
        stmt = select(ScoutingVideo).where(*conditions).limit(50)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class VideoClipRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(VideoClip, session)

    async def get_by_id_with_relations(self, clip_id: int) -> VideoClip | None:
        stmt = (
            select(VideoClip)
            .options(
                selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player),
                selectinload(VideoClip.views),
            )
            .where(VideoClip.id == clip_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_video(self, video_id: int) -> list:
        stmt = (
            select(VideoClip)
            .options(selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player), selectinload(VideoClip.views))
            .where(VideoClip.video_id == video_id)
            .order_by(VideoClip.start_time)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_clips_for_player(self, player_id: int, limit: int = 50) -> list:
        """Get clips where player is tagged, with video info."""
        stmt = (
            select(VideoClip)
            .join(ClipPlayerTag, ClipPlayerTag.clip_id == VideoClip.id)
            .options(selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player), selectinload(VideoClip.views))
            .where(ClipPlayerTag.player_id == player_id)
            .order_by(VideoClip.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_clips_for_shared_videos(self, team_ids: list[int], limit: int = 50) -> list:
        """Get clips from videos shared with player's teams."""
        stmt = (
            select(VideoClip)
            .join(ScoutingVideo, ScoutingVideo.id == VideoClip.video_id)
            .options(selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player), selectinload(VideoClip.views))
            .where(
                ScoutingVideo.shared_with_team == True,
                ScoutingVideo.team_id.in_(team_ids),
            )
            .order_by(VideoClip.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_clips_for_parent_shared_videos(self, team_ids: list[int], limit: int = 50) -> list:
        """Get clips from videos shared with parents for given teams."""
        stmt = (
            select(VideoClip)
            .join(ScoutingVideo, ScoutingVideo.id == VideoClip.video_id)
            .options(selectinload(VideoClip.player_tags).selectinload(ClipPlayerTag.player), selectinload(VideoClip.views))
            .where(
                ScoutingVideo.shared_with_parents == True,
                ScoutingVideo.team_id.in_(team_ids),
            )
            .order_by(VideoClip.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class AnnotationRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(VideoAnnotation, session)

    async def get_by_video(self, video_id: int) -> list:
        stmt = (
            select(VideoAnnotation)
            .where(VideoAnnotation.video_id == video_id)
            .order_by(VideoAnnotation.timestamp)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_clip(self, clip_id: int) -> list:
        stmt = (
            select(VideoAnnotation)
            .where(VideoAnnotation.clip_id == clip_id)
            .order_by(VideoAnnotation.timestamp)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ClipViewRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(ClipView, session)

    async def get_by_clip(self, clip_id: int) -> list:
        stmt = select(ClipView).where(ClipView.clip_id == clip_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def has_watched(self, clip_id: int, user_id: int) -> bool:
        stmt = select(ClipView).where(
            ClipView.clip_id == clip_id, ClipView.user_id == user_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None


class StorageQuotaRepository(BaseRepository):
    def __init__(self, session: AsyncSession):
        super().__init__(TeamStorageQuota, session)

    async def get_by_team(self, team_id: int) -> TeamStorageQuota | None:
        stmt = select(TeamStorageQuota).where(TeamStorageQuota.team_id == team_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create(self, team_id: int) -> TeamStorageQuota:
        quota = await self.get_by_team(team_id)
        if not quota:
            quota = TeamStorageQuota(team_id=team_id)
            self.session.add(quota)
            await self.session.flush()
        return quota

    async def update_usage(self, team_id: int, bytes_delta: int):
        """Add or subtract bytes from team usage."""
        quota = await self.get_or_create(team_id)
        quota.storage_used_bytes = max(0, quota.storage_used_bytes + bytes_delta)
        await self.session.flush()
        return quota
