"""Seed script: Link existing seed data to a PlatformClub for super admin visibility."""
import asyncio
import logging
logging.disable(logging.CRITICAL)

import src.models  # noqa: register all models

from src.utils.database import AsyncSessionLocal, init_db
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.platform_club import PlatformClub
from src.models.club_billing_config import ClubBillingConfig
from src.models.club_feature_flag import ClubFeatureFlag
from src.services.feature_flag_service import FeatureFlagService
from sqlalchemy import select, func
from datetime import date


async def main():
    await init_db()

    async with AsyncSessionLocal() as s:
        # Get admin
        r = await s.execute(select(User).where(User.role == "admin"))
        admin = r.scalars().first()
        if not admin:
            print("No admin found!")
            return

        # Check if club already exists
        r = await s.execute(select(PlatformClub))
        existing = r.scalars().first()

        if existing:
            club = existing
            print(f"Club already exists: id={club.id} name={club.name} admin_id={club.admin_id}")
        else:
            club = PlatformClub(
                name="HOOPS Basketball Club",
                status="active",
                pricing_tier=2,
                max_players=250,
                admin_id=admin.id,
                billing_email=admin.email,
            )
            s.add(club)
            await s.flush()
            await s.refresh(club)
            print(f"PlatformClub id={club.id} created")

        # Ensure billing config exists
        r = await s.execute(
            select(ClubBillingConfig).where(ClubBillingConfig.club_id == club.id)
        )
        if not r.scalars().first():
            billing = ClubBillingConfig(
                club_id=club.id,
                billing_email=admin.email,
                billing_day=1,
                next_billing_date=date(2026, 3, 1),
                is_recurring_active=True,
            )
            s.add(billing)
            await s.flush()
            print("BillingConfig created")
        else:
            print("BillingConfig already exists")

        # Ensure feature flags exist
        r = await s.execute(
            select(func.count(ClubFeatureFlag.id)).where(ClubFeatureFlag.club_id == club.id)
        )
        flag_count = r.scalar() or 0
        if flag_count == 0:
            ff = FeatureFlagService(s)
            await ff.initialize_default_flags(club.id)
            print("Feature flags initialized")
        else:
            print(f"Feature flags already exist ({flag_count})")

        await s.commit()

        # Summary
        r = await s.execute(
            select(func.count(TeamMember.id))
            .join(Team, TeamMember.team_id == Team.id)
            .where(Team.created_by_admin_id == admin.id, TeamMember.role_in_team == "player")
        )
        player_count = r.scalar() or 0

        r = await s.execute(
            select(func.count(Team.id)).where(Team.created_by_admin_id == admin.id)
        )
        team_count = r.scalar() or 0

        print(f"\nSUMMARY:")
        print(f"  Club: {club.name} (id={club.id})")
        print(f"  Admin: {admin.name} (id={admin.id})")
        print(f"  Teams: {team_count}")
        print(f"  Players: {player_count}")
        print(f"  Tier: {club.pricing_tier} (max {club.max_players})")
        print(f"  Status: {club.status}")


if __name__ == "__main__":
    asyncio.run(main())
