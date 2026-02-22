"""HOOPS AI - Admin Auth Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.user_repository import UserRepository
from src.services.auth_service import hash_password, verify_password, create_access_token, decode_token


class AdminAuthService:
    def __init__(self, session: AsyncSession):
        self.user_repo = UserRepository(session)

    async def register_admin(self, name: str, email: str, password: str, phone: str | None = None):
        existing = await self.user_repo.get_by_email_and_role(email, "admin")
        if existing:
            raise ValueError("Email already registered")
        user = await self.user_repo.create(
            name=name, email=email,
            password_hash=hash_password(password),
            role="admin",
            phone=phone,
        )
        token = create_access_token({"sub": str(user.id), "role": "admin"})
        return {"user": user, "token": token}

    async def login_admin(self, email: str, password: str):
        user = await self.user_repo.get_by_email_and_role(email, "admin")
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        token = create_access_token({"sub": str(user.id), "role": "admin"})
        return {"user": user, "token": token}

    async def get_current_admin(self, token: str):
        payload = decode_token(token)
        if not payload:
            return None
        if payload.get("role") != "admin":
            return None
        user_id = int(payload.get("sub", 0))
        user = await self.user_repo.get_by_id(user_id)
        if user and user.role == "admin":
            return user
        return None
