"""HOOPS AI - Scouting / Video Room Service

Delegates video CRUD to VideoService, clip CRUD to ClipService,
and annotation CRUD to AnnotationService while keeping the same public API.
"""
import logging
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from src.repositories.scouting_repository import (
    ScoutingVideoRepository, VideoClipRepository,
    AnnotationRepository, ClipViewRepository, StorageQuotaRepository,
)
from src.models.scouting_video import ScoutingVideo
from src.models.video_clip import VideoClip
from src.models.video_annotation import VideoAnnotation
from src.models.clip_view import ClipView
from src.services.cloudinary_service import CloudinaryService

from src.services.video_service import VideoService
from src.services.clip_service import ClipService
from src.services.annotation_service import AnnotationService


class ScoutingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.video_repo = ScoutingVideoRepository(session)
        self.clip_repo = VideoClipRepository(session)
        self.annotation_repo = AnnotationRepository(session)
        self.view_repo = ClipViewRepository(session)
        self.quota_repo = StorageQuotaRepository(session)
        self.cloudinary = CloudinaryService()
        # Sub-services
        self._video_svc = VideoService(session)
        self._clip_svc = ClipService(session)
        self._annotation_svc = AnnotationService(session)

    # ─── Videos (delegated to VideoService) ──────────────────────────

    async def register_video(self, coach_id: int, team_id: int | None, data: dict) -> ScoutingVideo:
        return await self._video_svc.register_video(coach_id, team_id, data)

    async def get_videos(self, coach_id: int, video_type: str | None = None,
                         team_id: int | None = None, search: str | None = None) -> list:
        return await self._video_svc.get_videos(coach_id, video_type, team_id, search)

    async def get_video_detail(self, video_id: int) -> ScoutingVideo | None:
        return await self._video_svc.get_video_detail(video_id)

    async def update_video(self, video_id: int, coach_id: int, data: dict) -> ScoutingVideo | None:
        return await self._video_svc.update_video(video_id, coach_id, data)

    async def delete_video(self, video_id: int, coach_id: int) -> bool:
        return await self._video_svc.delete_video(video_id, coach_id)

    async def share_video(self, video_id: int, coach_id: int, team_id: int) -> bool:
        return await self._video_svc.share_video(video_id, coach_id, team_id)

    async def unshare_video(self, video_id: int, coach_id: int) -> bool:
        return await self._video_svc.unshare_video(video_id, coach_id)

    async def share_video_with_parents(self, video_id: int, coach_id: int) -> bool:
        return await self._video_svc.share_video_with_parents(video_id, coach_id)

    async def unshare_video_with_parents(self, video_id: int, coach_id: int) -> bool:
        return await self._video_svc.unshare_video_with_parents(video_id, coach_id)

    # ─── Clips (delegated to ClipService) ─────────────────────────────

    async def create_clip(self, video_id: int, coach_id: int, data: dict) -> VideoClip:
        return await self._clip_svc.create_clip(
            video_id, coach_id, data,
            notify_callback=self._notify_tagged_players,
        )

    async def get_clips(self, video_id: int) -> list:
        return await self._clip_svc.get_clips(video_id)

    async def update_clip(self, clip_id: int, coach_id: int, data: dict) -> VideoClip | None:
        return await self._clip_svc.update_clip(clip_id, coach_id, data)

    async def delete_clip(self, clip_id: int, coach_id: int) -> bool:
        return await self._clip_svc.delete_clip(clip_id, coach_id)

    async def add_player_tag(self, clip_id: int, coach_id: int, player_id: int) -> bool:
        return await self._clip_svc.add_player_tag(
            clip_id, coach_id, player_id,
            notify_callback=self._notify_tagged_players,
        )

    async def remove_player_tag(self, clip_id: int, coach_id: int, player_id: int) -> bool:
        return await self._clip_svc.remove_player_tag(clip_id, coach_id, player_id)

    # ─── Annotations (delegated to AnnotationService) ─────────────────

    async def save_annotation(self, video_id: int, coach_id: int, data: dict) -> VideoAnnotation:
        return await self._annotation_svc.save_annotation(video_id, coach_id, data)

    async def get_annotations(self, video_id: int) -> list:
        return await self._annotation_svc.get_annotations(video_id)

    async def update_annotation(self, ann_id: int, coach_id: int, data: dict) -> VideoAnnotation | None:
        return await self._annotation_svc.update_annotation(ann_id, coach_id, data)

    async def delete_annotation(self, ann_id: int, coach_id: int) -> bool:
        return await self._annotation_svc.delete_annotation(ann_id, coach_id)

    # ─── Admin Access ────────────────────────────────────────────────

    async def get_videos_for_teams(self, team_ids: list[int], coach_ids: list[int] | None = None,
                                    video_type: str | None = None,
                                    search: str | None = None) -> list:
        """Admin: get all videos across their teams (no share filter)."""
        return await self.video_repo.get_by_team_ids(team_ids, coach_ids, video_type, search)

    async def get_video_detail_for_admin(self, video_id: int, admin_team_ids: list[int],
                                          admin_coach_ids: list[int] | None = None) -> ScoutingVideo | None:
        """Admin: get video detail only if video belongs to admin's teams or coaches."""
        video = await self.video_repo.get_with_clips(video_id)
        if not video:
            return None
        if video.team_id in admin_team_ids:
            return video
        if admin_coach_ids and video.coach_id in admin_coach_ids:
            return video
        return None

    # ─── Parent Feed ─────────────────────────────────────────────────

    async def get_parent_feed(self, player_id: int | None, team_ids: list[int]) -> list:
        """Parent: clips from parent-shared videos + tagged clips for their child."""
        tagged_clips = await self.clip_repo.get_clips_for_player(player_id) if player_id else []
        parent_shared_clips = await self.clip_repo.get_clips_for_parent_shared_videos(team_ids) if team_ids else []

        # Merge and deduplicate
        seen = set()
        merged = []
        for clip in tagged_clips + parent_shared_clips:
            if clip.id not in seen:
                seen.add(clip.id)
                merged.append(clip)
        merged.sort(key=lambda c: c.created_at, reverse=True)
        return merged[:50]

    # ─── Player Feed ───────────────────────────────────────────────

    async def get_player_feed(self, player_id: int, team_ids: list[int]) -> list:
        """Get clips where player is tagged OR from shared team videos."""
        tagged_clips = await self.clip_repo.get_clips_for_player(player_id)
        shared_clips = await self.clip_repo.get_clips_for_shared_videos(team_ids) if team_ids else []

        # Merge and deduplicate by clip id
        seen = set()
        merged = []
        for clip in tagged_clips + shared_clips:
            if clip.id not in seen:
                seen.add(clip.id)
                merged.append(clip)

        # Sort by created_at descending
        merged.sort(key=lambda c: c.created_at, reverse=True)
        return merged[:50]

    async def get_clip_detail(self, clip_id: int) -> dict | None:
        """Get clip with annotations for player view."""
        clip = await self.clip_repo.get_by_id_with_relations(clip_id)
        if not clip:
            return None
        video = await self.video_repo.get_by_id(clip.video_id)
        annotations = await self.annotation_repo.get_by_clip(clip_id)
        # Also get video-level annotations in the clip's time range
        video_anns = await self.annotation_repo.get_by_video(clip.video_id)
        clip_anns = [a for a in video_anns if a.timestamp >= clip.start_time and a.timestamp <= clip.end_time]

        return {
            "clip": clip,
            "video": video,
            "annotations": annotations + clip_anns,
        }

    async def mark_watched(self, clip_id: int, user_id: int) -> bool:
        if await self.view_repo.has_watched(clip_id, user_id):
            return True  # Already watched
        view = ClipView(clip_id=clip_id, user_id=user_id)
        self.session.add(view)
        try:
            await self.session.flush()
        except Exception:
            pass  # Unique constraint
        return True

    # ─── Quota ─────────────────────────────────────────────────────

    async def get_quota(self, team_id: int) -> dict:
        quota = await self.quota_repo.get_or_create(team_id)
        return {
            "storage_used_bytes": quota.storage_used_bytes,
            "storage_limit_bytes": quota.storage_limit_bytes,
            "video_ttl_days": quota.video_ttl_days,
        }

    # ─── Cleanup ───────────────────────────────────────────────────

    async def cleanup_expired_videos(self) -> int:
        """Delete expired videos from Cloudinary and DB."""
        expired = await self.video_repo.get_expired()
        count = 0
        for video in expired:
            self.cloudinary.delete_video(video.cloudinary_public_id)
            if video.team_id and video.file_size:
                await self.quota_repo.update_usage(video.team_id, -video.file_size)
            await self.video_repo.delete(video.id)
            count += 1
        return count

    # ─── Expiry Notifications ────────────────────────────────────────

    async def send_expiry_notifications(self) -> int:
        """Send 48h and 6h expiry warnings to coaches."""
        from src.models.coach import Coach
        from src.services.messaging_service import MessagingService

        count = 0
        msg_service = MessagingService(self.session)

        # 48-hour warnings
        videos_48h = await self.video_repo.get_expiring_within(48, "48h")
        for video in videos_48h:
            coach = await self.session.get(Coach, video.coach_id)
            if not coach or not coach.user_id:
                continue
            try:
                await msg_service.send_message(
                    sender_id=coach.user_id,
                    sender_role="admin",
                    subject="סרטון יימחק בעוד 48 שעות",
                    body=f"הסרטון \"{video.title}\" יימחק אוטומטית בעוד 48 שעות. "
                         f"כדי לשמור אותו לצמיתות, היכנס לחדר הוידאו ולחץ על 'שמור לצמיתות'.",
                    message_type="video_expiry",
                    target_type="individual",
                    target_user_id=coach.user_id,
                )
                video.expiry_notified_48h = True
                count += 1
            except Exception as e:
                logger.error(f"Expiry notification 48h error for video {video.id}: {e}")

        # 6-hour warnings
        videos_6h = await self.video_repo.get_expiring_within(6, "6h")
        for video in videos_6h:
            coach = await self.session.get(Coach, video.coach_id)
            if not coach or not coach.user_id:
                continue
            try:
                await msg_service.send_message(
                    sender_id=coach.user_id,
                    sender_role="admin",
                    subject="סרטון יימחק בעוד 6 שעות!",
                    body=f"הסרטון \"{video.title}\" יימחק אוטומטית בעוד 6 שעות! "
                         f"היכנס לחדר הוידאו עכשיו אם ברצונך לשמור אותו.",
                    message_type="video_expiry",
                    target_type="individual",
                    target_user_id=coach.user_id,
                )
                video.expiry_notified_6h = True
                count += 1
            except Exception as e:
                logger.error(f"Expiry notification 6h error for video {video.id}: {e}")

        return count

    # ─── Notifications ─────────────────────────────────────────────

    async def _notify_tagged_players(self, clip: VideoClip, video: ScoutingVideo | None, player_ids: list[int]):
        """Send in-app notification to tagged players."""
        try:
            from src.models.player import Player
            from src.models.team_member import TeamMember
            from src.services.messaging_service import MessagingService

            if not video:
                return

            msg_service = MessagingService(self.session)
            video_title = video.title or "video"
            action_label = clip.action_type.replace("_", " ").title()

            for pid in player_ids:
                # Find user_id for this player
                player = await self.session.get(Player, pid)
                if not player or not player.user_id:
                    continue

                await msg_service.send_message(
                    sender_id=video.coach_id,
                    sender_role="coach",
                    subject=f"תויגת בקליפ חדש: {action_label}",
                    body=f"המאמן תייג אותך בקליפ מתוך \"{video_title}\". "
                         f"היכנס ל-Video Feed כדי לצפות.",
                    message_type="video_tag",
                    target_type="individual",
                    target_user_id=player.user_id,
                )
        except Exception as e:
            logger.error(f"Scouting notification error: {e}")
