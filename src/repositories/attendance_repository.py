"""HOOPS AI - Attendance Repository"""
from typing import Sequence
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.attendance import Attendance
from src.repositories.base_repository import BaseRepository


class AttendanceRepository(BaseRepository[Attendance]):
    def __init__(self, session: AsyncSession):
        super().__init__(Attendance, session)

    async def get_by_event(self, coach_id: int, event_id: int) -> Sequence[Attendance]:
        stmt = (
            select(Attendance)
            .where(Attendance.coach_id == coach_id, Attendance.event_id == event_id)
            .order_by(Attendance.player_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def upsert_batch(self, coach_id: int, event_id: int, records: list[dict]):
        """Create or update attendance records for an event."""
        for rec in records:
            existing = await self.session.execute(
                select(Attendance).where(
                    Attendance.event_id == event_id,
                    Attendance.player_id == rec["player_id"],
                )
            )
            att = existing.scalar_one_or_none()
            if att:
                att.present = rec.get("present", False)
                att.notes = rec.get("notes")
            else:
                self.session.add(Attendance(
                    coach_id=coach_id, event_id=event_id,
                    player_id=rec["player_id"],
                    present=rec.get("present", False),
                    notes=rec.get("notes"),
                ))
        await self.session.flush()

    async def get_player_stats(self, coach_id: int) -> list[dict]:
        """Get attendance stats per player: total events, attended, percentage."""
        stmt = (
            select(
                Attendance.player_id,
                func.count(Attendance.id).label("total"),
                func.sum(func.cast(Attendance.present, Attendance.id.type)).label("attended"),
            )
            .where(Attendance.coach_id == coach_id)
            .group_by(Attendance.player_id)
        )
        result = await self.session.execute(stmt)
        rows = result.all()
        return [
            {"player_id": r.player_id, "total": r.total, "attended": int(r.attended or 0),
             "percentage": round(int(r.attended or 0) / r.total * 100) if r.total > 0 else 0}
            for r in rows
        ]

    async def recalculate_streaks(self, player_ids: list[int]) -> dict[int, tuple[int, int]]:
        """Recalculate current and highest attendance streaks for given players.

        Returns dict of {player_id: (current_streak, highest_streak)}.
        Queries attendance ordered by Event.date DESC, counts consecutive present=True.
        """
        from src.models.event import Event

        results = {}
        for pid in player_ids:
            stmt = (
                select(Attendance.present)
                .join(Event, Attendance.event_id == Event.id)
                .where(Attendance.player_id == pid)
                .order_by(Event.date.desc())
            )
            result = await self.session.execute(stmt)
            records = [row[0] for row in result.all()]

            current = 0
            highest = 0
            streak = 0
            found_first_absence = False

            for present in records:
                if present:
                    streak += 1
                    if not found_first_absence:
                        current = streak
                else:
                    found_first_absence = True
                    if streak > highest:
                        highest = streak
                    streak = 0

            # Final streak might be the highest
            if streak > highest:
                highest = streak
            if not found_first_absence:
                current = streak
            if current > highest:
                highest = current

            results[pid] = (current, highest)

        return results
