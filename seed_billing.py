"""
HOOPS AI - Seed Billing Data (new model: PaymentPlan + Installment + OneTimeCharge)
Runs AFTER seed_data.py. Creates payment plans and one-time charges for all teams.
"""
import asyncio
import random
from datetime import date, timedelta

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select, text
from src.utils.database import engine, Base, AsyncSessionLocal
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.player import Player
from src.models.payment_plan import PaymentPlan
from src.models.installment import Installment
from src.models.one_time_charge import OneTimeCharge


# ── Config ────────────────────────────────────────────────────────────────

# Annual fee by team name keywords
ANNUAL_FEE_BY_AGE = {
    "U18": 4500, "נוער": 4500,
    "U16": 4000, "נערים": 4000,
    "U14": 3800, "צעירים": 3800,
    "U12": 3500, "ילדים": 3500,
    "U10": 3000,
    "U8":  2500,
}
DEFAULT_ANNUAL_FEE = 3600

SEASON = "2025-2026"
NUM_INSTALLMENTS = 10
BILLING_DAY = 10
START_MONTH = "2025-09"

PAYMENT_METHODS = ["credit_card", "check", "bank_transfer", "cash"]


def get_annual_fee(team_name: str) -> int:
    for keyword, fee in ANNUAL_FEE_BY_AGE.items():
        if keyword in team_name:
            return fee
    return DEFAULT_ANNUAL_FEE


def make_installment_dates(start_month: str, billing_day: int, num: int) -> list[date]:
    year, month = int(start_month[:4]), int(start_month[5:7])
    day = min(billing_day, 28)
    dates = []
    for i in range(num):
        m = month + i
        y = year + (m - 1) // 12
        m = (m - 1) % 12 + 1
        dates.append(date(y, m, day))
    return dates


async def seed_billing():
    # Drop + recreate new tables
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: OneTimeCharge.__table__.drop(c, checkfirst=True))
        await conn.run_sync(lambda c: Installment.__table__.drop(c, checkfirst=True))
        await conn.run_sync(lambda c: PaymentPlan.__table__.drop(c, checkfirst=True))
        await conn.run_sync(lambda c: PaymentPlan.__table__.create(c))
        await conn.run_sync(lambda c: Installment.__table__.create(c))
        await conn.run_sync(lambda c: OneTimeCharge.__table__.create(c))

    async with AsyncSessionLocal() as session:
        # Get admin
        admin_result = await session.execute(select(User).where(User.role == "admin"))
        admin = admin_result.scalar_one_or_none()
        if not admin:
            print("No admin found — run seed_data.py first")
            return

        # Get all teams
        teams_result = await session.execute(
            select(Team).where(Team.created_by_admin_id == admin.id)
        )
        teams = list(teams_result.scalars().all())
        print(f"Found {len(teams)} teams")

        due_dates = make_installment_dates(START_MONTH, BILLING_DAY, NUM_INSTALLMENTS)
        today = date.today()

        total_plans = 0
        total_installments = 0
        total_charges = 0

        for team in teams:
            annual_fee = get_annual_fee(team.name)
            installment_amount = round(annual_fee / NUM_INSTALLMENTS, 2)

            # Get active players in team
            members_result = await session.execute(
                select(TeamMember).where(
                    TeamMember.team_id == team.id,
                    TeamMember.role_in_team == "player",
                    TeamMember.player_id.isnot(None),
                    TeamMember.is_active == True,
                )
            )
            members = list(members_result.scalars().all())
            print(f"  Team '{team.name}': {len(members)} players, fee={annual_fee}")

            for member in members:
                pid = member.player_id

                # Give some players a discount (10% chance)
                has_discount = random.random() < 0.10
                player_fee = round(annual_fee * 0.85, 2) if has_discount else float(annual_fee)
                player_inst_amount = round(player_fee / NUM_INSTALLMENTS, 2)

                # Create payment plan
                plan = PaymentPlan(
                    player_id=pid,
                    team_id=team.id,
                    created_by_admin_id=admin.id,
                    season=SEASON,
                    total_amount=player_fee,
                    num_installments=NUM_INSTALLMENTS,
                    billing_day=BILLING_DAY,
                    start_month=START_MONTH,
                    payment_method=random.choice(["credit_card", "check"]),
                    description=f"דמי קבוצה עונת {SEASON}",
                    is_active=True,
                )
                session.add(plan)
                await session.flush()
                total_plans += 1

                # Create installments with realistic paid/pending/overdue distribution
                for i, due in enumerate(due_dates, start=1):
                    if due < today:
                        # Past due dates — mostly paid, some overdue
                        rand = random.random()
                        if rand < 0.80:
                            status = "paid"
                            paid_date = due + timedelta(days=random.randint(-2, 5))
                            method = random.choice(PAYMENT_METHODS)
                        else:
                            status = "overdue"
                            paid_date = None
                            method = None
                    elif due <= today + timedelta(days=10):
                        # Current month — some paid, most pending
                        rand = random.random()
                        if rand < 0.35:
                            status = "paid"
                            paid_date = today - timedelta(days=random.randint(0, 5))
                            method = random.choice(PAYMENT_METHODS)
                        else:
                            status = "pending"
                            paid_date = None
                            method = None
                    else:
                        # Future — pending
                        status = "pending"
                        paid_date = None
                        method = None

                    inst = Installment(
                        plan_id=plan.id,
                        player_id=pid,
                        team_id=team.id,
                        installment_number=i,
                        amount=player_inst_amount,
                        due_date=due,
                        status=status,
                        paid_date=paid_date,
                        payment_method=method,
                        marked_by_admin_id=admin.id if status == "paid" else None,
                    )
                    session.add(inst)
                    total_installments += 1

            # Create one-time charges for the team (e.g., jerseys, registration)
            # Registration fee — all players
            reg_due = date(2025, 9, 15)
            for member in members:
                pid = member.player_id
                reg_paid = random.random() < 0.90
                charge = OneTimeCharge(
                    player_id=pid,
                    team_id=team.id,
                    created_by_admin_id=admin.id,
                    title="דמי רישום — עונת 2025-2026",
                    amount=random.choice([500, 600, 800]),
                    due_date=reg_due,
                    status="paid" if reg_paid else "overdue",
                    paid_date=reg_due - timedelta(days=random.randint(1, 14)) if reg_paid else None,
                    payment_method=random.choice(PAYMENT_METHODS) if reg_paid else None,
                    marked_by_admin_id=admin.id if reg_paid else None,
                )
                session.add(charge)
                total_charges += 1

            # Jersey fee — ~60% of players
            jersey_members = random.sample(members, k=int(len(members) * 0.6))
            jersey_due = date(2025, 10, 1)
            for member in jersey_members:
                pid = member.player_id
                jersey_paid = random.random() < 0.70
                charge = OneTimeCharge(
                    player_id=pid,
                    team_id=team.id,
                    created_by_admin_id=admin.id,
                    title="חולצת קבוצה",
                    amount=120,
                    due_date=jersey_due,
                    status="paid" if jersey_paid else ("overdue" if jersey_due < today else "pending"),
                    paid_date=jersey_due + timedelta(days=random.randint(0, 7)) if jersey_paid else None,
                    payment_method=random.choice(PAYMENT_METHODS) if jersey_paid else None,
                    marked_by_admin_id=admin.id if jersey_paid else None,
                )
                session.add(charge)
                total_charges += 1

        await session.commit()
        print(f"\nDone! Seeded: {total_plans} plans, {total_installments} installments, {total_charges} one-time charges")


if __name__ == "__main__":
    asyncio.run(seed_billing())
