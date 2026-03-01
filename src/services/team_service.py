"""HOOPS AI - Team Service"""
import random
import string
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.team_repository import TeamRepository
from src.repositories.team_member_repository import TeamMemberRepository
from src.utils.exceptions import ValidationError, ForbiddenError, NotFoundError, ConflictError


class TeamService:
    def __init__(self, session: AsyncSession):
        self.team_repo = TeamRepository(session)
        self.member_repo = TeamMemberRepository(session)

    # --- Admin actions ---
    async def create_team(self, admin_id: int, name: str, club_name: str | None = None,
                          age_group: str | None = None, level: str | None = None):
        """Admin creates a team. Generates both coach and player invite codes."""
        team = await self.team_repo.create(
            name=name,
            club_name=club_name,
            age_group=age_group,
            level=level,
            created_by_admin_id=admin_id,
        )
        return team

    async def get_admin_teams(self, admin_id: int):
        """Get all teams created by this admin."""
        return await self.team_repo.get_by_admin_id(admin_id)

    async def get_team_detail(self, team_id: int):
        return await self.team_repo.get_with_members(team_id)

    async def regenerate_coach_invite(self, team_id: int, admin_id: int):
        """Only the admin who created the team can regenerate coach invite."""
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team", team_id)
        if team.created_by_admin_id != admin_id:
            raise ForbiddenError("Only the admin who created this team can regenerate invite codes")
        new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        new_token = str(uuid.uuid4())
        return await self.team_repo.update(team_id, coach_invite_code=new_code, coach_invite_token=new_token)

    async def regenerate_player_invite(self, team_id: int, admin_id: int):
        """Admin regenerates the player invite code."""
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team", team_id)
        if team.created_by_admin_id != admin_id:
            raise ForbiddenError("Only the admin who created this team can regenerate invite codes")
        new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        new_token = str(uuid.uuid4())
        return await self.team_repo.update(team_id, player_invite_code=new_code, player_invite_token=new_token)

    async def regenerate_parent_invite(self, team_id: int, admin_id: int):
        """Admin regenerates the parent invite code."""
        team = await self.team_repo.get_by_id(team_id)
        if not team:
            raise NotFoundError("Team", team_id)
        if team.created_by_admin_id != admin_id:
            raise ForbiddenError("Only the admin who created this team can regenerate invite codes")
        new_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        new_token = str(uuid.uuid4())
        return await self.team_repo.update(team_id, parent_invite_code=new_code, parent_invite_token=new_token)

    # --- Coach join ---
    async def join_as_coach(self, user_id: int, code: str):
        """Coach joins a team using coach_invite_code."""
        team = await self.team_repo.get_by_coach_invite_code(code)
        if not team:
            raise ValidationError("Invalid coach invite code")
        existing = await self.member_repo.get_membership(team.id, user_id)
        if existing:
            raise ConflictError("Already a member of this team")
        member = await self.member_repo.create(
            team_id=team.id, user_id=user_id, role_in_team="coach",
        )
        return {"team": team, "member": member}

    # --- Validation ---
    async def validate_invite_link(self, token: str):
        """Check all invite token types (coach, player, parent) and return match."""
        # Check coach invite token
        team = await self.team_repo.get_by_coach_invite_token(token)
        if team:
            return {"id": team.id, "name": team.name, "type": "coach"}
        # Check player invite token
        team = await self.team_repo.get_by_player_invite_token(token)
        if team:
            return {"id": team.id, "name": team.name, "type": "player"}
        # Check parent invite token
        team = await self.team_repo.get_by_parent_invite_token(token)
        if team:
            return {"id": team.id, "name": team.name, "type": "parent"}
        return None

    async def remove_member(self, team_id: int, member_id: int, admin_id: int):
        """Admin removes a member from team."""
        team = await self.team_repo.get_by_id(team_id)
        if not team or team.created_by_admin_id != admin_id:
            raise ForbiddenError("Not authorized")
        return await self.member_repo.delete(member_id)

    async def get_team_members(self, team_id: int):
        return await self.member_repo.get_by_team(team_id)

    async def get_user_teams(self, user_id: int):
        return await self.member_repo.get_by_user(user_id)
