"""HOOPS AI - Admin Contacts API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.models.user import User
from src.models.team import Team
from src.models.team_member import TeamMember

router = APIRouter(prefix="/api/admin", tags=["admin-contacts"])


@router.get("/contacts")
async def admin_contacts(
    team_id: int | None = Query(None),
    role: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """All contacts across admin's teams with full details."""
    # 1. Get admin's team IDs
    team_stmt = select(Team.id).where(Team.created_by_admin_id == admin.id)
    result = await db.execute(team_stmt)
    admin_team_ids = [row[0] for row in result.all()]

    if not admin_team_ids:
        return {"success": True, "data": [], "total": 0}

    # 2. Build query for team members
    stmt = (
        select(TeamMember)
        .where(TeamMember.team_id.in_(admin_team_ids), TeamMember.is_active == True)
        .options(
            selectinload(TeamMember.user),
            selectinload(TeamMember.player),
            selectinload(TeamMember.team),
        )
    )

    # Apply filters
    if team_id:
        stmt = stmt.where(TeamMember.team_id == team_id)
    if role:
        stmt = stmt.where(TeamMember.role_in_team == role)

    result = await db.execute(stmt)
    members = result.scalars().all()

    # 3. Build response
    contacts = []
    for m in members:
        if not m.user:
            continue

        # Search filter (applied in Python for simplicity with joined data)
        if search:
            q = search.lower()
            if q not in (m.user.name or "").lower() and q not in (m.user.email or "").lower():
                continue

        contact = {
            "id": m.id,
            "user_id": m.user_id,
            "name": m.user.name,
            "email": m.user.email,
            "phone": m.user.phone,
            "role": m.role_in_team,
            "team_id": m.team_id,
            "team_name": m.team.name if m.team else None,
            "joined_at": str(m.joined_at),
        }

        # Player-specific data
        if m.role_in_team == "player" and m.player:
            contact["player_data"] = {
                "player_id": m.player.id,
                "birth_date": str(m.player.birth_date) if m.player.birth_date else None,
                "height": m.player.height,
                "weight": m.player.weight,
                "position": m.player.position,
                "jersey_number": m.player.jersey_number,
                "gender": m.player.gender,
                "phone": m.player.phone,
                "email": m.player.email,
            }

        # Parent — linked child
        if m.role_in_team == "parent" and m.player:
            contact["linked_child"] = {
                "name": m.player.name,
                "player_id": m.player.id,
            }

        contacts.append(contact)

    # Sort by role priority (coach first, then players, then parents), then name
    role_order = {"coach": 0, "player": 1, "parent": 2}
    contacts.sort(key=lambda c: (role_order.get(c["role"], 9), c["name"] or ""))

    return {"success": True, "data": contacts, "total": len(contacts)}
