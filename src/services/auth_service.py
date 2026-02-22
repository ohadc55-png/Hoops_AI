"""HOOPS AI - Authentication Service"""
from datetime import datetime, timedelta, timezone, date as date_type
import bcrypt
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings
from src.repositories.coach_repository import CoachRepository
from src.repositories.user_repository import UserRepository
from src.repositories.team_repository import TeamRepository
from src.repositories.team_member_repository import TeamMemberRepository

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repo = CoachRepository(session)

    async def register(self, name: str, email: str, password: str, **kwargs):
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        coach = await self.repo.create(
            name=name,
            email=email,
            password_hash=hash_password(password),
            **kwargs,
        )
        token = create_access_token({"sub": str(coach.id)})
        return {"coach": coach, "token": token}

    async def login(self, email: str, password: str):
        coach = await self.repo.get_by_email(email)
        if not coach or not verify_password(password, coach.password_hash):
            raise ValueError("Invalid email or password")
        token = create_access_token({"sub": str(coach.id)})
        return {"coach": coach, "token": token}

    async def get_current_coach(self, token: str):
        payload = decode_token(token)
        if not payload:
            return None
        coach_id = int(payload.get("sub", 0))
        return await self.repo.get_by_id(coach_id)

    async def update_profile(self, coach_id: int, data: dict):
        return await self.repo.update(coach_id, **data)

    async def register_and_join_team(
        self, session: AsyncSession, name: str, email: str, password: str,
        phone: str | None = None, date_of_birth: date_type | None = None,
        invite_code: str | None = None, invite_link_token: str | None = None,
    ):
        """One-step coach registration + team join via invite code/token."""
        # 1. Check coach email not taken
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        # 2. Find team by invite
        team_repo = TeamRepository(session)
        team = None
        if invite_link_token:
            team = await team_repo.get_by_coach_invite_token(invite_link_token.strip())
        if not team and invite_code:
            team = await team_repo.get_by_coach_invite_code(invite_code.strip().upper())
        if not team:
            raise ValueError("Invalid invite code or link")

        pw_hash = hash_password(password)

        # 3. Create Coach record (legacy table)
        coach = await self.repo.create(
            name=name, email=email, password_hash=pw_hash,
        )

        # 4. Create User record with role=coach
        user_repo = UserRepository(session)
        existing_user = await user_repo.get_by_email_and_role(email, "coach")
        if existing_user:
            coach_user = existing_user
        else:
            coach_user = await user_repo.create(
                name=name, email=email, password_hash=pw_hash,
                role="coach", phone=phone, date_of_birth=date_of_birth,
            )

        # 5. Link Coach → User
        await self.repo.update(coach.id, user_id=coach_user.id)

        # 6. Create TeamMember
        member_repo = TeamMemberRepository(session)
        await member_repo.create(
            team_id=team.id, user_id=coach_user.id, role_in_team="coach",
        )

        # 7. Return JWT (coach-based token for legacy compat)
        token = create_access_token({"sub": str(coach.id)})
        return {"coach": coach, "token": token, "team": team}
