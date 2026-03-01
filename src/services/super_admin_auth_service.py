"""HOOPS AI - Super Admin Auth Service"""
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.super_admin_repository import SuperAdminRepository
from src.services.auth_service import hash_password, verify_password, create_access_token, decode_token
from src.utils.exceptions import AuthenticationError, ConflictError, ForbiddenError


class SuperAdminAuthService:
    def __init__(self, session: AsyncSession):
        self.repo = SuperAdminRepository(session)

    async def register(self, name: str, email: str, password: str, phone: str | None = None):
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictError("Email already registered")
        admin = await self.repo.create(
            name=name, email=email,
            password_hash=hash_password(password),
            phone=phone,
        )
        token = create_access_token({"sub": str(admin.id), "role": "super_admin"})
        return {"admin": admin, "token": token}

    async def login(self, email: str, password: str):
        admin = await self.repo.get_by_email(email)
        if not admin or not verify_password(password, admin.password_hash):
            raise AuthenticationError("Invalid email or password")
        if not admin.is_active:
            raise ForbiddenError("Account is deactivated")
        token = create_access_token({"sub": str(admin.id), "role": "super_admin"})
        return {"admin": admin, "token": token}

    async def get_current_super_admin(self, token: str):
        payload = decode_token(token)
        if not payload:
            return None
        if payload.get("role") != "super_admin":
            return None
        admin_id = int(payload.get("sub", 0))
        admin = await self.repo.get_by_id(admin_id)
        if admin and admin.is_active:
            return admin
        return None
