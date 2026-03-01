"""HOOPS AI - Club Registration Service"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.club_registration_repository import ClubRegistrationRepository
from src.repositories.user_repository import UserRepository
from src.repositories.platform_club_repository import PlatformClubRepository
from src.services.auth_service import hash_password, create_access_token
from src.services.notification_service import NotificationService
from src.utils.exceptions import ValidationError, NotFoundError, ConflictError


class ClubRegistrationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.link_repo = ClubRegistrationRepository(session)
        self.user_repo = UserRepository(session)
        self.club_repo = PlatformClubRepository(session)
        self.notif_service = NotificationService(session)

    async def validate_link(self, token: str) -> dict:
        """Validate a registration link and return club info."""
        link = await self.link_repo.get_by_token(token)
        if not link:
            raise NotFoundError("Registration link")
        if not link.is_active:
            raise ValidationError("This registration link has been deactivated")
        if link.expires_at and link.expires_at < datetime.utcnow():
            raise ValidationError("This registration link has expired")
        return {
            "club_id": link.club.id,
            "club_name": link.club.name,
            "token": link.token,
        }

    async def register_admin(
        self,
        token: str,
        name: str,
        email: str,
        password: str,
        phone: str | None = None,
        role_title: str | None = None,
    ) -> dict:
        """Register a club admin via a registration link."""
        # Validate the link
        link = await self.link_repo.get_by_token(token)
        if not link:
            raise NotFoundError("Registration link")
        if not link.is_active:
            raise ValidationError("This registration link has been deactivated")
        if link.expires_at and link.expires_at < datetime.utcnow():
            raise ValidationError("This registration link has expired")

        # Check email not already used for admin role
        existing = await self.user_repo.get_by_email_and_role(email, "admin")
        if existing:
            raise ConflictError("Email already registered as admin")

        # Create user with admin role
        user = await self.user_repo.create(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            phone=phone,
        )

        # Link user to the platform club
        club = link.club
        if not club.admin_id:
            club.admin_id = user.id
            await self.session.flush()

        # Generate auth token
        auth_token = create_access_token({"sub": str(user.id), "role": "admin"})

        # Notify super admin
        await self.notif_service.create(
            title=f"New admin registered: {name}",
            notification_type="club_registered",
            priority="medium",
            body=f"{name} ({email}) registered for {club.name}",
            club_id=club.id,
            action_url=f"/super-admin/clubs/{club.id}",
        )

        return {
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": "admin",
            },
            "token": auth_token,
            "club_name": club.name,
        }

    async def cleanup_expired_links(self) -> int:
        """Background task: deactivate expired links."""
        count = await self.link_repo.deactivate_expired()
        if count:
            await self.session.commit()
        return count
