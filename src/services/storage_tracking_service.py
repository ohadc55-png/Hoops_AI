"""HOOPS AI - Storage Tracking Service

Aggregates storage usage across clubs and checks thresholds.
Creates notifications when clubs approach storage limits or player tier limits.
"""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.platform_club import PlatformClub
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.team_storage_quota import TeamStorageQuota
from src.models.scouting_video import ScoutingVideo
from src.models.knowledge_document import KnowledgeDocument
from src.services.notification_service import NotificationService

# Pricing tier player limits (must match platform_club_service.py)
TIER_LIMITS = {1: 150, 2: 250, 3: 350, 4: 9999}


class StorageTrackingService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.notif_service = NotificationService(session)

    async def get_club_storage_summary(self, club_id: int) -> dict:
        """Get aggregated storage usage for a club across all teams."""
        club = await self.session.get(PlatformClub, club_id)
        if not club or not club.admin_id:
            return {"video_bytes": 0, "video_limit_bytes": 0, "pct": 0}

        # Find all teams for this club admin
        team_ids = await self._get_club_team_ids(club.admin_id)
        if not team_ids:
            return {"video_bytes": 0, "video_limit_bytes": 0, "pct": 0}

        # Sum storage across all team quotas
        stmt = select(
            func.coalesce(func.sum(TeamStorageQuota.storage_used_bytes), 0),
            func.coalesce(func.sum(TeamStorageQuota.storage_limit_bytes), 0),
        ).where(TeamStorageQuota.team_id.in_(team_ids))
        result = await self.session.execute(stmt)
        row = result.first()
        used = row[0] if row else 0
        limit = row[1] if row else 0
        pct = round((used / limit * 100), 1) if limit > 0 else 0

        return {"video_bytes": used, "video_limit_bytes": limit, "pct": pct}

    async def get_club_player_count(self, club_id: int) -> int:
        """Count total players across all teams for a club."""
        club = await self.session.get(PlatformClub, club_id)
        if not club or not club.admin_id:
            return 0

        team_ids = await self._get_club_team_ids(club.admin_id)
        if not team_ids:
            return 0

        stmt = select(func.count(TeamMember.id)).where(
            TeamMember.team_id.in_(team_ids),
            TeamMember.role_in_team == "player",
            TeamMember.is_active == True,
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def check_storage_thresholds(self) -> int:
        """Check all active clubs for storage usage > 80%. Returns notification count."""
        stmt = select(PlatformClub).where(PlatformClub.status == "active")
        result = await self.session.execute(stmt)
        clubs = result.scalars().all()

        notifications_created = 0
        for club in clubs:
            if not club.admin_id:
                continue
            summary = await self.get_club_storage_summary(club.id)
            pct = summary["pct"]

            if pct >= 95:
                await self.notif_service.create(
                    title=f"Storage critical: {club.name} at {pct}%",
                    notification_type="storage_threshold",
                    priority="urgent",
                    body=f"{club.name} has used {pct}% of storage quota. Immediate action needed.",
                    club_id=club.id,
                    action_url=f"/super-admin/clubs/{club.id}",
                )
                notifications_created += 1
            elif pct >= 80:
                await self.notif_service.create(
                    title=f"Storage warning: {club.name} at {pct}%",
                    notification_type="storage_threshold",
                    priority="high",
                    body=f"{club.name} is approaching storage limit ({pct}% used).",
                    club_id=club.id,
                    action_url=f"/super-admin/clubs/{club.id}",
                )
                notifications_created += 1

        return notifications_created

    async def check_tier_thresholds(self) -> int:
        """Check all active clubs for player count approaching tier limit. Returns notification count."""
        stmt = select(PlatformClub).where(PlatformClub.status == "active")
        result = await self.session.execute(stmt)
        clubs = result.scalars().all()

        notifications_created = 0
        for club in clubs:
            tier = club.pricing_tier
            if not tier or tier not in TIER_LIMITS:
                continue

            max_players = TIER_LIMITS[tier]
            if max_players >= 9999:
                continue  # Enterprise — no limit

            player_count = await self.get_club_player_count(club.id)
            if player_count <= 0:
                continue

            pct = round(player_count / max_players * 100, 1)

            if player_count >= max_players:
                await self.notif_service.create(
                    title=f"Player limit reached: {club.name}",
                    notification_type="tier_threshold",
                    priority="urgent",
                    body=f"{club.name} has {player_count}/{max_players} players (tier {tier}). Upgrade needed.",
                    club_id=club.id,
                    action_url=f"/super-admin/clubs/{club.id}",
                )
                notifications_created += 1
            elif pct >= 85:
                await self.notif_service.create(
                    title=f"Player limit approaching: {club.name} ({pct}%)",
                    notification_type="tier_threshold",
                    priority="high",
                    body=f"{club.name} has {player_count}/{max_players} players (tier {tier}). Consider upgrading.",
                    club_id=club.id,
                    action_url=f"/super-admin/clubs/{club.id}",
                )
                notifications_created += 1

        return notifications_created

    async def get_platform_storage_overview(self) -> dict:
        """Platform-wide storage summary for analytics."""
        stmt = select(PlatformClub).where(PlatformClub.status == "active")
        result = await self.session.execute(stmt)
        clubs = result.scalars().all()

        total_used = 0
        total_limit = 0
        club_summaries = []

        for club in clubs:
            summary = await self.get_club_storage_summary(club.id)
            total_used += summary["video_bytes"]
            total_limit += summary["video_limit_bytes"]
            club_summaries.append({
                "club_id": club.id,
                "club_name": club.name,
                "video_bytes": summary["video_bytes"],
                "video_limit_bytes": summary["video_limit_bytes"],
                "pct": summary["pct"],
            })

        # Sort by usage descending
        club_summaries.sort(key=lambda x: x["video_bytes"], reverse=True)

        return {
            "total_used_bytes": total_used,
            "total_limit_bytes": total_limit,
            "total_pct": round(total_used / total_limit * 100, 1) if total_limit > 0 else 0,
            "clubs": club_summaries[:20],  # Top 20 by usage
        }

    async def _get_club_team_ids(self, admin_id: int) -> list[int]:
        """Get all team IDs for a given admin (club owner)."""
        stmt = select(Team.id).where(Team.created_by_admin_id == admin_id)
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
