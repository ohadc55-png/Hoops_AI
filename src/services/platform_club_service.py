"""HOOPS AI - Platform Club Service"""
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.platform_club_repository import PlatformClubRepository, ClubRegistrationLinkRepository
from src.models.platform_club import PlatformClub, ClubRegistrationLink
from src.models.club_billing_config import ClubBillingConfig
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.services.feature_flag_service import FeatureFlagService


# Pricing tiers: tier → (max_players, price_ILS)
PRICING_TIERS = {
    1: {"max_players": 150, "price": 350, "label": "Basic (up to 150)"},
    2: {"max_players": 250, "price": 550, "label": "Growth (up to 250)"},
    3: {"max_players": 350, "price": 750, "label": "Pro (up to 350)"},
    4: {"max_players": 9999, "price": 950, "label": "Enterprise (unlimited)"},
}


class PlatformClubService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.club_repo = PlatformClubRepository(session)
        self.link_repo = ClubRegistrationLinkRepository(session)

    async def create_club(
        self,
        name: str,
        pricing_tier: int | None = None,
        custom_price: float | None = None,
        max_players: int = 150,
        region_id: int | None = None,
        billing_email: str | None = None,
        notes: str | None = None,
    ) -> PlatformClub:
        club = await self.club_repo.create(
            name=name,
            status="active",
            pricing_tier=pricing_tier,
            custom_price=custom_price,
            max_players=max_players,
            region_id=region_id,
            billing_email=billing_email,
            notes=notes,
        )
        # Create billing config
        billing_config = ClubBillingConfig(club_id=club.id, billing_email=billing_email)
        self.session.add(billing_config)

        # Initialize feature flags (all enabled by default)
        ff_service = FeatureFlagService(self.session)
        await ff_service.initialize_default_flags(club.id)

        await self.session.flush()
        return club

    async def update_club(self, club_id: int, **kwargs) -> PlatformClub | None:
        return await self.club_repo.update(club_id, **kwargs)

    async def suspend_club(self, club_id: int) -> PlatformClub | None:
        return await self.club_repo.update(club_id, status="suspended")

    async def activate_club(self, club_id: int) -> PlatformClub | None:
        return await self.club_repo.update(club_id, status="active")

    async def terminate_club(self, club_id: int) -> PlatformClub | None:
        return await self.club_repo.update(club_id, status="terminated")

    async def get_club_detail(self, club_id: int) -> dict | None:
        """Get club with aggregated stats (teams, users, etc.)."""
        club = await self.club_repo.get_with_details(club_id)
        if not club:
            return None

        # Count teams and users if admin is linked
        teams_count = 0
        coaches_count = 0
        players_count = 0
        parents_count = 0

        if club.admin_id:
            # Count teams owned by this admin
            result = await self.session.execute(
                select(func.count(Team.id))
                .where(Team.created_by_admin_id == club.admin_id, Team.is_active == True)
            )
            teams_count = result.scalar() or 0

            # Get team IDs for member counts
            team_result = await self.session.execute(
                select(Team.id).where(Team.created_by_admin_id == club.admin_id, Team.is_active == True)
            )
            team_ids = [row[0] for row in team_result.all()]

            if team_ids:
                counts_result = await self.session.execute(
                    select(TeamMember.role_in_team, func.count(TeamMember.id))
                    .where(TeamMember.team_id.in_(team_ids), TeamMember.is_active == True)
                    .group_by(TeamMember.role_in_team)
                )
                role_counts = {row[0]: row[1] for row in counts_result.all()}
                coaches_count = role_counts.get("coach", 0)
                players_count = role_counts.get("player", 0)
                parents_count = role_counts.get("parent", 0)

        # Feature flags
        flags = {f.feature_key: f.is_enabled for f in club.feature_flags} if club.feature_flags else {}

        # Registration links
        links = await self.link_repo.get_active_by_club(club_id)

        # Pricing info
        tier_info = PRICING_TIERS.get(club.pricing_tier) if club.pricing_tier else None
        monthly_price = club.custom_price or (tier_info["price"] if tier_info else 0)

        return {
            "club": {
                "id": club.id,
                "name": club.name,
                "status": club.status,
                "region_id": club.region_id,
                "region_name": club.region.name if club.region else None,
                "pricing_tier": club.pricing_tier,
                "tier_label": tier_info["label"] if tier_info else "Custom",
                "custom_price": club.custom_price,
                "monthly_price": monthly_price,
                "max_players": club.max_players,
                "storage_quota_video_gb": club.storage_quota_video_gb,
                "storage_quota_media_gb": club.storage_quota_media_gb,
                "admin_id": club.admin_id,
                "admin_name": club.admin.name if club.admin else None,
                "admin_email": club.admin.email if club.admin else None,
                "billing_email": club.billing_email,
                "notes": club.notes,
                "created_at": club.created_at.isoformat() if club.created_at else None,
            },
            "stats": {
                "teams": teams_count,
                "coaches": coaches_count,
                "players": players_count,
                "parents": parents_count,
                "total_users": coaches_count + players_count + parents_count,
            },
            "feature_flags": flags,
            "billing_config": {
                "billing_day": club.billing_config.billing_day if club.billing_config else 10,
                "billing_email": club.billing_config.billing_email if club.billing_config else None,
                "is_recurring_active": club.billing_config.is_recurring_active if club.billing_config else False,
                "next_billing_date": club.billing_config.next_billing_date.isoformat() if club.billing_config and club.billing_config.next_billing_date else None,
            },
            "registration_links": [
                {
                    "id": link.id,
                    "token": link.token,
                    "expires_at": link.expires_at.isoformat() if link.expires_at else None,
                    "is_active": link.is_active,
                    "url": f"/join/club/{link.token}",
                }
                for link in links
            ],
        }

    async def get_all_clubs_with_stats(
        self,
        status: str | None = None,
        region_id: int | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """Get all clubs with basic stats."""
        clubs = await self.club_repo.get_all_with_filters(
            status=status, region_id=region_id, search=search, limit=limit, offset=offset,
        )
        result = []
        for club in clubs:
            # Quick count of users via admin_id
            total_users = 0
            if club.admin_id:
                team_result = await self.session.execute(
                    select(Team.id).where(Team.created_by_admin_id == club.admin_id, Team.is_active == True)
                )
                team_ids = [row[0] for row in team_result.all()]
                if team_ids:
                    count_result = await self.session.execute(
                        select(func.count(TeamMember.id))
                        .where(TeamMember.team_id.in_(team_ids), TeamMember.is_active == True)
                    )
                    total_users = count_result.scalar() or 0

            tier_info = PRICING_TIERS.get(club.pricing_tier) if club.pricing_tier else None
            result.append({
                "id": club.id,
                "name": club.name,
                "status": club.status,
                "pricing_tier": club.pricing_tier,
                "tier_label": tier_info["label"] if tier_info else "Custom",
                "monthly_price": club.custom_price or (tier_info["price"] if tier_info else 0),
                "max_players": club.max_players,
                "total_users": total_users,
                "admin_id": club.admin_id,
                "created_at": club.created_at.isoformat() if club.created_at else None,
            })
        return result

    async def get_dashboard_stats(self) -> dict:
        """Platform-wide stats for dashboard."""
        # Club counts by status
        status_counts = await self.club_repo.count_by_status()
        total_clubs = sum(status_counts.values())
        active_clubs = status_counts.get("active", 0)

        # Total users across all clubs
        user_count_result = await self.session.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        total_users = user_count_result.scalar() or 0

        # Users by role
        role_result = await self.session.execute(
            select(User.role, func.count(User.id))
            .where(User.is_active == True)
            .group_by(User.role)
        )
        users_by_role = {row[0]: row[1] for row in role_result.all()}

        # MRR estimate (active clubs × tier pricing)
        mrr = 0
        active_result = await self.session.execute(
            select(PlatformClub).where(PlatformClub.status == "active")
        )
        for club in active_result.scalars().all():
            if club.custom_price:
                mrr += club.custom_price
            elif club.pricing_tier and club.pricing_tier in PRICING_TIERS:
                mrr += PRICING_TIERS[club.pricing_tier]["price"]

        # Recent clubs (last 5)
        recent_result = await self.session.execute(
            select(PlatformClub).order_by(PlatformClub.created_at.desc()).limit(5)
        )
        recent_clubs = [
            {"id": c.id, "name": c.name, "status": c.status, "created_at": c.created_at.isoformat() if c.created_at else None}
            for c in recent_result.scalars().all()
        ]

        return {
            "total_clubs": total_clubs,
            "active_clubs": active_clubs,
            "suspended_clubs": status_counts.get("suspended", 0),
            "total_users": total_users,
            "users_by_role": users_by_role,
            "mrr": mrr,
            "recent_clubs": recent_clubs,
        }

    async def generate_registration_link(self, club_id: int) -> dict:
        """Generate a new registration link for a club."""
        club = await self.club_repo.get_by_id(club_id)
        if not club:
            raise ValueError("Club not found")
        link = await self.link_repo.create(club_id=club_id)
        return {
            "id": link.id,
            "token": link.token,
            "expires_at": link.expires_at.isoformat() if link.expires_at else None,
            "url": f"/join/club/{link.token}",
        }

    async def deactivate_registration_link(self, link_id: int) -> bool:
        """Deactivate a registration link."""
        link = await self.link_repo.get_by_id(link_id)
        if not link:
            return False
        link.is_active = False
        await self.session.flush()
        return True
