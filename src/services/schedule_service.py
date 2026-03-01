"""HOOPS AI - Schedule Service (admin-managed team events + approval workflow)"""
import uuid
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.team_event import TeamEvent
from src.models.schedule_request import ScheduleRequest
from src.repositories.team_event_repository import TeamEventRepository
from src.repositories.team_repository import TeamRepository
from src.repositories.schedule_request_repository import ScheduleRequestRepository
from src.utils.exceptions import NotFoundError, ForbiddenError


class ScheduleService:
    def __init__(self, session: AsyncSession):
        self.event_repo = TeamEventRepository(session)
        self.team_repo = TeamRepository(session)
        self.request_repo = ScheduleRequestRepository(session)
        self.session = session

    async def create_event(self, admin_id: int, team_id: int, **kwargs) -> TeamEvent:
        """Create a single team event."""
        team = await self.team_repo.get_by_id(team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Team not found or not authorized")
        return await self.event_repo.create(
            team_id=team_id, created_by_admin_id=admin_id, **kwargs
        )

    async def create_recurring_events(self, admin_id: int, team_id: int,
                                       repeat_weeks: int, **kwargs) -> list[TeamEvent]:
        """Create a series of recurring weekly events."""
        team = await self.team_repo.get_by_id(team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Team not found or not authorized")

        group = str(uuid.uuid4())
        base_date = kwargs.pop("date")
        events = []
        for week in range(repeat_weeks):
            event_date = base_date + timedelta(weeks=week)
            event = await self.event_repo.create(
                team_id=team_id, created_by_admin_id=admin_id,
                date=event_date, is_recurring=True, recurrence_group=group,
                **kwargs
            )
            events.append(event)
        return events

    async def update_event(self, event_id: int, admin_id: int, **kwargs):
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundError("Event")
        team = await self.team_repo.get_by_id(event.team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")

        # Detect transport info changes before applying update
        old_departure = event.departure_time
        old_address = event.venue_address
        old_is_away = event.is_away

        updated = await self.event_repo.update(event_id, **kwargs)

        # Send notification if transport info changed on an away game
        new_is_away = updated.is_away if updated else old_is_away
        if new_is_away and updated:
            new_departure = updated.departure_time
            new_address = updated.venue_address
            if new_departure != old_departure or new_address != old_address:
                await self._notify_transport_change(updated, admin_id)

        return updated

    async def _notify_transport_change(self, event, admin_id: int):
        """Send notification to all team members when transport info changes."""
        try:
            from src.services.messaging_service import MessagingService
            msg_service = MessagingService(self.session)
            date_str = str(event.date) if event.date else ""
            body = (
                f"עדכון הסעה: {event.title} ({date_str})\n"
                f"שעת יציאה: {event.departure_time or 'לא צוין'}\n"
                f"כתובת: {event.venue_address or 'לא צוין'}"
            )
            await msg_service.send_message(
                sender_id=admin_id,
                sender_role="admin",
                subject=f"עדכון הסעה - {event.title}",
                body=body,
                message_type="transport_update",
                target_type="team",
                target_team_ids=[event.team_id],
            )
        except Exception:
            pass  # Don't fail event update if notification fails

    async def delete_event(self, event_id: int, admin_id: int):
        event = await self.event_repo.get_by_id(event_id)
        if not event:
            raise NotFoundError("Event")
        team = await self.team_repo.get_by_id(event.team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")
        return await self.event_repo.update(event_id, is_active=False)

    async def delete_series(self, recurrence_group: str, admin_id: int):
        events = await self.event_repo.get_by_recurrence_group(recurrence_group)
        if not events:
            raise NotFoundError("Series")
        team = await self.team_repo.get_by_id(events[0].team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")
        count = 0
        for e in events:
            await self.event_repo.update(e.id, is_active=False)
            count += 1
        return count

    async def get_admin_schedule(self, admin_id: int):
        """All upcoming events across all admin's teams."""
        return await self.event_repo.get_by_admin(admin_id)

    async def get_team_schedule(self, team_id: int):
        return await self.event_repo.get_upcoming_by_team(team_id)

    async def get_teams_schedule(self, team_ids: list[int]):
        """Schedule for multiple teams (used by coach/player/parent)."""
        return await self.event_repo.get_upcoming_by_teams(team_ids)

    async def get_team_events_by_month(self, team_id: int, year: int, month: int):
        return await self.event_repo.get_by_month(team_id, year, month)

    async def get_teams_events_by_month(self, team_ids: list[int], year: int, month: int):
        """Events for multiple teams filtered by month."""
        return await self.event_repo.get_by_month_for_teams(team_ids, year, month)

    # ==================== SCHEDULE REQUESTS ====================

    async def create_schedule_request(self, coach_id: int, team_id: int, **kwargs) -> ScheduleRequest:
        """Coach submits a schedule request for admin approval."""
        return await self.request_repo.create(
            coach_id=coach_id, team_id=team_id, status="pending", **kwargs
        )

    async def get_coach_requests(self, coach_id: int):
        return await self.request_repo.get_by_coach(coach_id)

    async def get_pending_requests_for_admin(self, admin_id: int):
        return await self.request_repo.get_pending_by_admin(admin_id)

    async def approve_request(self, request_id: int, admin_id: int, response: str | None = None) -> ScheduleRequest:
        """Admin approves a request — creates TeamEvent from request data."""
        req = await self.request_repo.get_by_id(request_id)
        if not req or req.status != "pending":
            raise NotFoundError("Request")

        team = await self.team_repo.get_by_id(req.team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")

        # Create TeamEvent(s) from request
        event_kwargs = dict(
            title=req.title, event_type=req.event_type,
            time_start=req.time_start, time_end=req.time_end,
            location=req.location, opponent=req.opponent, notes=req.notes,
        )

        if req.repeat_weeks and req.repeat_weeks > 1:
            events = await self.create_recurring_events(
                admin_id=admin_id, team_id=req.team_id,
                repeat_weeks=req.repeat_weeks, date=req.date, **event_kwargs,
            )
            created_event_id = events[0].id
        else:
            event = await self.create_event(
                admin_id=admin_id, team_id=req.team_id,
                date=req.date, **event_kwargs,
            )
            created_event_id = event.id

        # Update request status
        req.status = "approved"
        req.reviewed_at = datetime.utcnow()
        req.reviewed_by_admin_id = admin_id
        req.admin_response = response
        req.created_event_id = created_event_id
        await self.session.flush()
        return req

    async def reject_request(self, request_id: int, admin_id: int, response: str | None = None) -> ScheduleRequest:
        """Admin rejects a request."""
        req = await self.request_repo.get_by_id(request_id)
        if not req or req.status != "pending":
            raise NotFoundError("Request")

        team = await self.team_repo.get_by_id(req.team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")

        req.status = "rejected"
        req.reviewed_at = datetime.utcnow()
        req.reviewed_by_admin_id = admin_id
        req.admin_response = response
        await self.session.flush()
        return req
