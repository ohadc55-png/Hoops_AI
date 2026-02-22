"""HOOPS AI - Messaging Service"""
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.club_message import ClubMessage
from src.models.message_recipient import MessageRecipient
from src.models.team_member import TeamMember
from src.models.user import User
from src.repositories.message_repository import ClubMessageRepository, MessageRecipientRepository
from src.repositories.team_member_repository import TeamMemberRepository


class MessagingService:
    def __init__(self, session: AsyncSession):
        self.msg_repo = ClubMessageRepository(session)
        self.recipient_repo = MessageRecipientRepository(session)
        self.member_repo = TeamMemberRepository(session)
        self.session = session

    async def send_message(
        self,
        sender_id: int,
        sender_role: str,
        subject: str | None,
        body: str,
        message_type: str,
        target_type: str,
        target_team_ids: list[int] | None = None,
        target_user_id: int | None = None,
        scheduled_at: str | None = None,
    ) -> ClubMessage:
        await self._validate_permissions(sender_role, target_type, scheduled_at is not None)

        msg_data = {
            "sender_id": sender_id,
            "sender_role": sender_role,
            "subject": subject,
            "body": body,
            "message_type": message_type,
            "target_type": target_type,
            "target_team_ids": ",".join(str(x) for x in target_team_ids) if target_team_ids else None,
            "target_user_id": target_user_id,
        }

        if scheduled_at:
            from datetime import datetime
            msg_data["is_scheduled"] = True
            msg_data["scheduled_at"] = datetime.fromisoformat(scheduled_at)
            msg_data["is_sent"] = False
        else:
            msg_data["is_sent"] = True
            msg_data["sent_at"] = datetime.now(timezone.utc)

        msg = await self.msg_repo.create(**msg_data)

        if not scheduled_at:
            user_ids = await self._resolve_recipients(
                sender_id, sender_role, target_type, target_team_ids, target_user_id
            )
            for uid in user_ids:
                try:
                    await self.recipient_repo.create(message_id=msg.id, user_id=uid)
                except Exception:
                    pass

        return msg

    async def _validate_permissions(self, sender_role: str, target_type: str, is_scheduled: bool):
        admin_only = {
            "all_club", "all_coaches", "all_players", "all_parents",
            "team", "team_players", "team_parents", "team_coaches", "individual",
        }
        coach_allowed = {"my_team", "my_team_players", "my_team_parents", "my_coach", "admin", "individual"}
        player_allowed = {"my_team", "my_coach", "admin", "admin_individual"}
        parent_allowed = {"my_team", "my_coach", "admin", "admin_individual"}

        if sender_role in ("admin", "system"):
            pass  # admin and system (platform) messages can target anyone
        elif sender_role == "coach":
            if target_type not in coach_allowed:
                raise ValueError(f"Coaches cannot send to target_type={target_type}")
            if is_scheduled:
                raise ValueError("Only admins can schedule messages")
        elif sender_role == "player":
            if target_type not in player_allowed:
                raise ValueError(f"Players cannot send to target_type={target_type}")
            if is_scheduled:
                raise ValueError("Only admins can schedule messages")
        elif sender_role == "parent":
            if target_type not in parent_allowed:
                raise ValueError(f"Parents cannot send to target_type={target_type}")
            if is_scheduled:
                raise ValueError("Only admins can schedule messages")
        else:
            raise ValueError(f"Unknown sender role: {sender_role}")

    async def _resolve_recipients(
        self,
        sender_id: int,
        sender_role: str,
        target_type: str,
        target_team_ids: list[int] | None,
        target_user_id: int | None,
    ) -> list[int]:
        user_ids: set[int] = set()

        if target_type == "all_club":
            # All active team members + all admins
            stmt = select(TeamMember.user_id).where(TeamMember.is_active == True)
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall() if row[0])
            stmt = select(User.id).where(User.role == "admin", User.is_active == True)
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall())

        elif target_type == "all_coaches":
            stmt = select(TeamMember.user_id).where(
                TeamMember.role_in_team == "coach", TeamMember.is_active == True
            )
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "all_players":
            stmt = select(TeamMember.user_id).where(
                TeamMember.role_in_team == "player", TeamMember.is_active == True
            )
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "all_parents":
            stmt = select(TeamMember.user_id).where(
                TeamMember.role_in_team == "parent", TeamMember.is_active == True
            )
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type in ("team", "team_players", "team_parents", "team_coaches"):
            if not target_team_ids:
                return []
            role_filter = {
                "team_players": "player",
                "team_parents": "parent",
                "team_coaches": "coach",
            }.get(target_type)
            stmt = select(TeamMember.user_id).where(
                TeamMember.team_id.in_(target_team_ids),
                TeamMember.is_active == True,
            )
            if role_filter:
                stmt = stmt.where(TeamMember.role_in_team == role_filter)
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "individual":
            if target_user_id:
                user_ids.add(target_user_id)

        elif target_type == "admin_individual":
            if target_user_id:
                from src.repositories.user_repository import UserRepository
                target = await UserRepository(self.session).get_by_id(target_user_id)
                if not target or target.role != "admin":
                    raise ValueError("Target must be an admin")
                user_ids.add(target_user_id)

        elif target_type == "admin":
            stmt = select(User.id).where(User.role == "admin", User.is_active == True)
            result = await self.session.execute(stmt)
            user_ids.update(row[0] for row in result.fetchall())

        elif target_type == "my_team":
            sender_teams = await self._get_sender_team_ids(sender_id)
            if sender_teams:
                stmt = select(TeamMember.user_id).where(
                    TeamMember.team_id.in_(sender_teams),
                    TeamMember.is_active == True,
                )
                result = await self.session.execute(stmt)
                user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "my_coach":
            sender_teams = await self._get_sender_team_ids(sender_id)
            if sender_teams:
                stmt = select(TeamMember.user_id).where(
                    TeamMember.team_id.in_(sender_teams),
                    TeamMember.role_in_team == "coach",
                    TeamMember.is_active == True,
                )
                result = await self.session.execute(stmt)
                user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "my_team_players":
            sender_teams = await self._get_sender_team_ids(sender_id)
            if sender_teams:
                stmt = select(TeamMember.user_id).where(
                    TeamMember.team_id.in_(sender_teams),
                    TeamMember.role_in_team == "player",
                    TeamMember.is_active == True,
                )
                result = await self.session.execute(stmt)
                user_ids.update(row[0] for row in result.fetchall() if row[0])

        elif target_type == "my_team_parents":
            sender_teams = await self._get_sender_team_ids(sender_id)
            if sender_teams:
                stmt = select(TeamMember.user_id).where(
                    TeamMember.team_id.in_(sender_teams),
                    TeamMember.role_in_team == "parent",
                    TeamMember.is_active == True,
                )
                result = await self.session.execute(stmt)
                user_ids.update(row[0] for row in result.fetchall() if row[0])

        # Always exclude sender
        user_ids.discard(sender_id)
        return list(user_ids)

    async def _get_sender_team_ids(self, sender_id: int) -> list[int]:
        memberships = await self.member_repo.get_by_user(sender_id)
        return [m.team_id for m in memberships]

    async def get_inbox(self, user_id: int, unread_only: bool = False, limit: int = 50):
        return await self.recipient_repo.get_inbox(user_id, unread_only, limit)

    async def get_sent(self, user_id: int, limit: int = 50):
        return await self.msg_repo.get_sent_by_user(user_id, limit)

    async def get_unread_count(self, user_id: int) -> int:
        return await self.recipient_repo.get_unread_count(user_id)

    async def mark_read(self, message_id: int, user_id: int):
        return await self.recipient_repo.mark_as_read(message_id, user_id)

    async def mark_all_read(self, user_id: int):
        return await self.recipient_repo.mark_all_read(user_id)

    async def get_message_stats(self, message_id: int, sender_id: int):
        msg = await self.msg_repo.get_by_id(message_id)
        if not msg or msg.sender_id != sender_id:
            raise ValueError("Not found or not authorized")
        recipients = await self.recipient_repo.get_recipients_for_message(message_id)
        total = len(recipients)
        read_count = sum(1 for r in recipients if r.is_read)
        return {"total": total, "read": read_count, "unread": total - read_count}

    async def get_scheduled(self, sender_id: int):
        return await self.msg_repo.get_scheduled_by_sender(sender_id)

    async def cancel_scheduled(self, message_id: int, sender_id: int):
        msg = await self.msg_repo.get_by_id(message_id)
        if not msg or msg.sender_id != sender_id:
            raise ValueError("Not found")
        if msg.is_sent:
            raise ValueError("Already sent, cannot cancel")
        return await self.msg_repo.update(message_id, is_active=False)

    async def process_scheduled_messages(self):
        pending = await self.msg_repo.get_scheduled_unsent()
        for msg in pending:
            try:
                team_ids = [int(x.strip()) for x in msg.target_team_ids.split(",") if x.strip()] if msg.target_team_ids else None
            except (ValueError, AttributeError):
                team_ids = None
            user_ids = await self._resolve_recipients(
                msg.sender_id, msg.sender_role, msg.target_type, team_ids, msg.target_user_id
            )
            for uid in user_ids:
                try:
                    await self.recipient_repo.create(message_id=msg.id, user_id=uid)
                except Exception:
                    pass
            await self.msg_repo.update(msg.id, is_sent=True, sent_at=datetime.now(timezone.utc))
