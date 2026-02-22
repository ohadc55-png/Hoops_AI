"""HOOPS AI - Scouting / Video Room Service"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from config import get_settings
from src.repositories.scouting_repository import (
    ScoutingVideoRepository, VideoClipRepository,
    AnnotationRepository, ClipViewRepository, StorageQuotaRepository,
)
from src.models.scouting_video import ScoutingVideo
from src.models.video_clip import VideoClip
from src.models.video_annotation import VideoAnnotation
from src.models.clip_player_tag import ClipPlayerTag
from src.models.clip_view import ClipView
from src.services.cloudinary_service import CloudinaryService

settings = get_settings()


class ScoutingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.video_repo = ScoutingVideoRepository(session)
        self.clip_repo = VideoClipRepository(session)
        self.annotation_repo = AnnotationRepository(session)
        self.view_repo = ClipViewRepository(session)
        self.quota_repo = StorageQuotaRepository(session)
        self.cloudinary = CloudinaryService()

    # ─── Videos ────────────────────────────────────────────────────

    async def register_video(self, coach_id: int, team_id: int | None, data: dict) -> ScoutingVideo:
        """Register a video after successful Cloudinary upload from browser."""
        file_size = data.get("file_size", 0)

        # Check quota if team assigned
        if team_id:
            quota = await self.quota_repo.get_or_create(team_id)
            if quota.storage_used_bytes + file_size > quota.storage_limit_bytes:
                raise ValueError("Storage quota exceeded for this team")

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

    # ─── Clips ─────────────────────────────────────────────────────

    async def create_clip(self, video_id: int, coach_id: int, data: dict) -> VideoClip:
        video = await self.video_repo.get_by_id(video_id)
        if not video or video.coach_id != coach_id:
            raise ValueError("Video not found")

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
            # Send notifications to tagged players
            await self._notify_tagged_players(clip, video, player_ids)

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

    async def add_player_tag(self, clip_id: int, coach_id: int, player_id: int) -> bool:
        clip = await self.clip_repo.get_by_id(clip_id)
        if not clip or clip.coach_id != coach_id:
            return False
        tag = ClipPlayerTag(clip_id=clip_id, player_id=player_id)
        self.session.add(tag)
        try:
            await self.session.flush()
        except Exception:
            return False  # Duplicate

        video = await self.video_repo.get_by_id(clip.video_id)
        await self._notify_tagged_players(clip, video, [player_id])
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

    # ─── Annotations ───────────────────────────────────────────────

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

    # ─── Parent Share ────────────────────────────────────────────────

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
                print(f"Expiry notification 48h error for video {video.id}: {e}")

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
                print(f"Expiry notification 6h error for video {video.id}: {e}")

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
            print(f"Scouting notification error: {e}")
