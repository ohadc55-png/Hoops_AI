"""HOOPS AI - Parent Auth Service"""
from datetime import date as date_type
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player import Player
from src.models.user import User
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.repositories.user_repository import UserRepository
from src.repositories.team_repository import TeamRepository
from src.repositories.team_member_repository import TeamMemberRepository
from src.services.auth_service import hash_password, verify_password, create_access_token, decode_token


class ParentAuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.team_repo = TeamRepository(session)
        self.member_repo = TeamMemberRepository(session)

    async def register_parent(self, name: str, email: str, password: str,
                              phone: str | None = None,
                              date_of_birth: date_type | None = None,
                              invite_code: str | None = None,
                              invite_link_token: str | None = None):
        # 1. Check email not taken (same email allowed for different roles)
        existing = await self.user_repo.get_by_email_and_role(email, "parent")
        if existing:
            raise ValueError("Email already registered")

        # 2. Find team by parent_invite_code
        team = None
        if invite_code:
            team = await self.team_repo.get_by_parent_invite_code(invite_code)
        elif invite_link_token:
            team = await self.team_repo.get_by_parent_invite_token(invite_link_token)

        if not team:
            raise ValueError("Invalid invite code or link")

        # 3. Create User with role="parent"
        user = await self.user_repo.create(
            name=name, email=email,
            password_hash=hash_password(password),
            role="parent", phone=phone, date_of_birth=date_of_birth,
        )

        # 4. Auto-link to child by email match on same team
        player_id = await self._find_child_by_email(team.id, email)

        # 5. Create TeamMember with role_in_team="parent"
        await self.member_repo.create(
            team_id=team.id, user_id=user.id,
            role_in_team="parent", player_id=player_id,
        )

        # 6. Return JWT
        token = create_access_token({"sub": str(user.id), "role": "parent"})
        return {"user": user, "token": token, "team": team}

    async def _find_child_by_email(self, team_id: int, parent_email: str) -> int | None:
        """Find a player on the same team whose email matches the parent's email."""
        email_lower = parent_email.lower()

        # Strategy 1: Player record with matching email or parent_email field
        stmt = (
            select(TeamMember.player_id)
            .join(Player, TeamMember.player_id == Player.id)
            .where(
                TeamMember.team_id == team_id,
                TeamMember.role_in_team == "player",
                TeamMember.is_active == True,
                TeamMember.player_id.isnot(None),
            )
        )
        result = await self.session.execute(stmt)
        player_member_ids = [row[0] for row in result.fetchall()]

        if player_member_ids:
            stmt = select(Player).where(Player.id.in_(player_member_ids))
            result = await self.session.execute(stmt)
            players = result.scalars().all()

            for p in players:
                if p.parent_email and p.parent_email.lower() == email_lower:
                    return p.id
                if p.email and p.email.lower() == email_lower:
                    return p.id

        # Strategy 2: User with role=player and same email on same team
        stmt = (
            select(TeamMember.player_id)
            .join(User, TeamMember.user_id == User.id)
            .where(
                TeamMember.team_id == team_id,
                TeamMember.role_in_team == "player",
                TeamMember.is_active == True,
                TeamMember.player_id.isnot(None),
                func.lower(User.email) == email_lower,
            )
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if row:
            return row[0]

        return None

    async def login_parent(self, email: str, password: str):
        user = await self.user_repo.get_by_email_and_role(email, "parent")
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        token = create_access_token({"sub": str(user.id), "role": "parent"})
        return {"user": user, "token": token}

    async def get_current_parent(self, token: str):
        payload = decode_token(token)
        if not payload:
            return None
        if payload.get("role") != "parent":
            return None
        user_id = int(payload.get("sub", 0))
        return await self.user_repo.get_by_id(user_id)
