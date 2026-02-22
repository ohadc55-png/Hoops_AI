"""HOOPS AI - Billing Repositories (PaymentPlan, Installment, OneTimeCharge)"""
from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.payment_plan import PaymentPlan
from src.models.installment import Installment
from src.models.one_time_charge import OneTimeCharge
from src.models.team_member import TeamMember
from src.models.player import Player


# ─── PaymentPlan Repository ────────────────────────────────────────────────

class PaymentPlanRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> PaymentPlan:
        plan = PaymentPlan(**kwargs)
        self.session.add(plan)
        await self.session.flush()
        await self.session.refresh(plan)
        return plan

    async def get_by_id(self, plan_id: int) -> PaymentPlan | None:
        result = await self.session.execute(
            select(PaymentPlan)
            .options(selectinload(PaymentPlan.installments), selectinload(PaymentPlan.player), selectinload(PaymentPlan.team))
            .where(PaymentPlan.id == plan_id)
        )
        return result.scalar_one_or_none()

    async def get_by_team(self, team_id: int, season: str | None = None) -> list[PaymentPlan]:
        stmt = (
            select(PaymentPlan)
            .options(selectinload(PaymentPlan.installments), selectinload(PaymentPlan.player))
            .where(PaymentPlan.team_id == team_id, PaymentPlan.is_active == True)
        )
        if season:
            stmt = stmt.where(PaymentPlan.season == season)
        stmt = stmt.order_by(PaymentPlan.player_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_admin(self, admin_id: int, season: str | None = None) -> list[PaymentPlan]:
        from src.models.team import Team
        stmt = (
            select(PaymentPlan)
            .join(Team, Team.id == PaymentPlan.team_id)
            .options(selectinload(PaymentPlan.installments), selectinload(PaymentPlan.player), selectinload(PaymentPlan.team))
            .where(Team.created_by_admin_id == admin_id, PaymentPlan.is_active == True)
        )
        if season:
            stmt = stmt.where(PaymentPlan.season == season)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_player(self, player_id: int) -> list[PaymentPlan]:
        stmt = (
            select(PaymentPlan)
            .options(selectinload(PaymentPlan.installments), selectinload(PaymentPlan.team))
            .where(PaymentPlan.player_id == player_id, PaymentPlan.is_active == True)
            .order_by(PaymentPlan.season.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, plan_id: int, **kwargs) -> PaymentPlan | None:
        plan = await self.session.get(PaymentPlan, plan_id)
        if not plan:
            return None
        for key, value in kwargs.items():
            setattr(plan, key, value)
        await self.session.flush()
        return plan

    async def deactivate(self, plan_id: int) -> bool:
        plan = await self.session.get(PaymentPlan, plan_id)
        if not plan:
            return False
        plan.is_active = False
        await self.session.flush()
        return True

    async def exists_for_player_season(self, player_id: int, team_id: int, season: str) -> bool:
        result = await self.session.execute(
            select(func.count()).where(
                PaymentPlan.player_id == player_id,
                PaymentPlan.team_id == team_id,
                PaymentPlan.season == season,
                PaymentPlan.is_active == True,
            )
        )
        return result.scalar() > 0


# ─── Installment Repository ────────────────────────────────────────────────

class InstallmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> Installment:
        inst = Installment(**kwargs)
        self.session.add(inst)
        await self.session.flush()
        return inst

    async def get_by_id(self, inst_id: int) -> Installment | None:
        return await self.session.get(Installment, inst_id)

    async def get_by_plan(self, plan_id: int) -> list[Installment]:
        result = await self.session.execute(
            select(Installment)
            .where(Installment.plan_id == plan_id)
            .order_by(Installment.installment_number)
        )
        return list(result.scalars().all())

    async def get_by_player(self, player_id: int) -> list[Installment]:
        result = await self.session.execute(
            select(Installment)
            .where(Installment.player_id == player_id)
            .order_by(Installment.due_date)
        )
        return list(result.scalars().all())

    async def update(self, inst_id: int, **kwargs) -> Installment | None:
        inst = await self.session.get(Installment, inst_id)
        if not inst:
            return None
        for key, value in kwargs.items():
            setattr(inst, key, value)
        await self.session.flush()
        return inst

    async def mark_all_overdue(self) -> int:
        """Global overdue check (background task). Returns count updated."""
        from sqlalchemy import update as sa_update
        today = date.today()
        result = await self.session.execute(
            sa_update(Installment)
            .where(
                Installment.status == "pending",
                Installment.due_date < today,
            )
            .values(status="overdue")
        )
        await self.session.flush()
        return result.rowcount

    async def get_summary_for_plan(self, plan_id: int) -> dict:
        result = await self.session.execute(
            select(Installment).where(Installment.plan_id == plan_id)
        )
        installments = result.scalars().all()
        total = sum(float(i.amount) for i in installments)
        paid = sum(float(i.amount) for i in installments if i.status == "paid")
        return {
            "total": total,
            "paid": paid,
            "pending": sum(float(i.amount) for i in installments if i.status == "pending"),
            "overdue": sum(float(i.amount) for i in installments if i.status == "overdue"),
            "paid_count": sum(1 for i in installments if i.status == "paid"),
            "total_count": len(installments),
        }


# ─── OneTimeCharge Repository ──────────────────────────────────────────────

class OneTimeChargeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **kwargs) -> OneTimeCharge:
        charge = OneTimeCharge(**kwargs)
        self.session.add(charge)
        await self.session.flush()
        return charge

    async def get_by_id(self, charge_id: int) -> OneTimeCharge | None:
        return await self.session.get(OneTimeCharge, charge_id)

    async def get_by_team(self, team_id: int, status: str | None = None) -> list[OneTimeCharge]:
        stmt = (
            select(OneTimeCharge)
            .options(selectinload(OneTimeCharge.player))
            .where(OneTimeCharge.team_id == team_id)
        )
        if status:
            stmt = stmt.where(OneTimeCharge.status == status)
        stmt = stmt.order_by(OneTimeCharge.due_date.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_player(self, player_id: int) -> list[OneTimeCharge]:
        result = await self.session.execute(
            select(OneTimeCharge)
            .where(OneTimeCharge.player_id == player_id)
            .order_by(OneTimeCharge.due_date.desc())
        )
        return list(result.scalars().all())

    async def get_by_admin(self, admin_id: int, team_id: int | None = None, status: str | None = None) -> list[OneTimeCharge]:
        from src.models.team import Team
        stmt = (
            select(OneTimeCharge)
            .join(Team, Team.id == OneTimeCharge.team_id)
            .options(selectinload(OneTimeCharge.player), selectinload(OneTimeCharge.team))
            .where(Team.created_by_admin_id == admin_id)
        )
        if team_id:
            stmt = stmt.where(OneTimeCharge.team_id == team_id)
        if status:
            stmt = stmt.where(OneTimeCharge.status == status)
        stmt = stmt.order_by(OneTimeCharge.due_date.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update(self, charge_id: int, **kwargs) -> OneTimeCharge | None:
        charge = await self.session.get(OneTimeCharge, charge_id)
        if not charge:
            return None
        for key, value in kwargs.items():
            setattr(charge, key, value)
        await self.session.flush()
        return charge

    async def delete(self, charge_id: int) -> bool:
        charge = await self.session.get(OneTimeCharge, charge_id)
        if not charge:
            return False
        await self.session.delete(charge)
        await self.session.flush()
        return True

    async def mark_all_overdue(self) -> int:
        from sqlalchemy import update as sa_update
        today = date.today()
        result = await self.session.execute(
            sa_update(OneTimeCharge)
            .where(
                OneTimeCharge.status == "pending",
                OneTimeCharge.due_date < today,
            )
            .values(status="overdue")
        )
        await self.session.flush()
        return result.rowcount

    async def get_unpaid_by_team(self, team_id: int) -> list[OneTimeCharge]:
        result = await self.session.execute(
            select(OneTimeCharge)
            .options(selectinload(OneTimeCharge.player))
            .where(
                OneTimeCharge.team_id == team_id,
                OneTimeCharge.status.in_(["pending", "overdue"]),
            )
            .order_by(OneTimeCharge.player_id, OneTimeCharge.due_date)
        )
        return list(result.scalars().all())
