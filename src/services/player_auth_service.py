"""HOOPS AI - Player Auth Service"""
from datetime import date as date_type
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.player import Player
from src.models.team_member import TeamMember
from src.models.coach import Coach
from src.repositories.user_repository import UserRepository
from src.repositories.team_repository import TeamRepository
from src.repositories.team_member_repository import TeamMemberRepository
from src.services.auth_service import hash_password, verify_password, create_access_token, decode_token
from src.utils.exceptions import AuthenticationError, ConflictError, ValidationError


class PlayerAuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.team_repo = TeamRepository(session)
        self.member_repo = TeamMemberRepository(session)

    async def register_player(self, name: str, email: str, password: str,
                              phone: str | None = None, date_of_birth: date_type | None = None,
                              invite_code: str | None = None, invite_link_token: str | None = None):
        # 1. Check existing email (same email allowed for different roles)
        existing = await self.user_repo.get_by_email_and_role(email, "player")
        if existing:
            raise ConflictError("כתובת האימייל כבר רשומה במערכת")

        # 2. Validate player invite code
        team = None
        if invite_code:
            team = await self.team_repo.get_by_player_invite_code(invite_code)
        elif invite_link_token:
            team = await self.team_repo.get_by_player_invite_token(invite_link_token)

        if not team:
            raise ValidationError("קוד ההזמנה או הלינק אינם תקינים")

        # 3. Create User with role="player"
        user = await self.user_repo.create(
            name=name, email=email,
            password_hash=hash_password(password),
            role="player", phone=phone, date_of_birth=date_of_birth,
        )

        # 4. Find the team's coach (via TeamMember where role_in_team="coach")
        stmt = select(TeamMember).where(
            TeamMember.team_id == team.id,
            TeamMember.role_in_team == "coach",
            TeamMember.is_active == True,
        ).limit(1)
        result = await self.session.execute(stmt)
        coach_membership = result.scalars().first()

        # 5. Find or create Player record
        player = None
        if coach_membership:
            # Find the Coach record by user_id
            stmt = select(Coach).where(Coach.user_id == coach_membership.user_id)
            result = await self.session.execute(stmt)
            coach = result.scalar_one_or_none()

            if coach:
                # Try to find existing Player by name under this coach
                stmt = select(Player).where(
                    Player.coach_id == coach.id,
                    Player.name == name,
                    Player.user_id.is_(None),
                )
                result = await self.session.execute(stmt)
                player = result.scalar_one_or_none()

                if player:
                    player.user_id = user.id
                    if phone:
                        player.phone = phone
                    if date_of_birth:
                        player.birth_date = str(date_of_birth)
                    await self.session.flush()
                else:
                    player = Player(
                        coach_id=coach.id, name=name, user_id=user.id,
                        phone=phone, birth_date=str(date_of_birth) if date_of_birth else None,
                        email=email,
                    )
                    self.session.add(player)
                    await self.session.flush()

        if not player:
            # No coach assigned yet — create player record with coach_id=0 placeholder
            player = Player(
                coach_id=0, name=name, user_id=user.id,
                phone=phone, birth_date=str(date_of_birth) if date_of_birth else None,
                email=email,
            )
            self.session.add(player)
            await self.session.flush()

        # 6. Create TeamMember
        await self.member_repo.create(
            team_id=team.id, user_id=user.id,
            role_in_team="player", player_id=player.id,
        )

        # 7. Return JWT
        token = create_access_token({"sub": str(user.id), "role": "player"})
        return {"user": user, "token": token, "team": team, "player": player}

    async def login_player(self, email: str, password: str):
        user = await self.user_repo.get_by_email_and_role(email, "player")
        if not user:
            raise AuthenticationError("כתובת האימייל לא נמצאה במערכת")
        if not verify_password(password, user.password_hash):
            raise AuthenticationError("הסיסמה שגויה, נסה שנית")
        token = create_access_token({"sub": str(user.id), "role": "player"})
        return {"user": user, "token": token}

    async def get_current_player(self, token: str):
        payload = decode_token(token)
        if not payload:
            return None
        if payload.get("role") != "player":
            return None
        user_id = int(payload.get("sub", 0))
        return await self.user_repo.get_by_id(user_id)

    async def update_profile(self, user_id: int, data: dict):
        return await self.user_repo.update(user_id, **data)
