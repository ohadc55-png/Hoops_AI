"""HOOPS AI - Admin Roles API"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select, update as sa_update
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.repositories.admin_role_repository import AdminRoleRepository
from src.repositories.user_repository import UserRepository
from src.models.user import User
from src.models.admin_role import AdminRole
from src.services.auth_service import decode_token

router = APIRouter(prefix="/api/admin/roles", tags=["admin-roles"])


class CreateRoleRequest(BaseModel):
    name: str
    description: str | None = None


class UpdateRoleRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class AssignRoleRequest(BaseModel):
    admin_role_id: int | None = None


def _role_to_dict(role):
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_default": role.is_default,
        "is_active": role.is_active,
    }


@router.get("")
async def list_roles(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = AdminRoleRepository(db)
    roles = await repo.get_all_active()
    return {"success": True, "data": [_role_to_dict(r) for r in roles]}


@router.post("")
async def create_role(req: CreateRoleRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Role name is required")
    repo = AdminRoleRepository(db)
    existing = await repo.get_by_name(req.name.strip())
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = await repo.create(name=req.name.strip(), description=req.description, is_default=False, is_active=True)
    return {"success": True, "data": _role_to_dict(role)}


@router.put("/{role_id}")
async def update_role(role_id: int, req: UpdateRoleRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = AdminRoleRepository(db)
    role = await repo.get_by_id(role_id)
    if not role or not role.is_active:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_default and req.name and req.name != role.name:
        raise HTTPException(status_code=400, detail="Cannot rename default roles")
    updates = {}
    if req.name is not None:
        updates["name"] = req.name.strip()
    if req.description is not None:
        updates["description"] = req.description
    if updates:
        role = await repo.update(role_id, **updates)
    return {"success": True, "data": _role_to_dict(role)}


@router.delete("/{role_id}")
async def delete_role(role_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = AdminRoleRepository(db)
    role = await repo.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default roles")
    await repo.update(role_id, is_active=False)
    return {"success": True}


@router.put("/users/{user_id}/role")
async def assign_role(user_id: int, req: AssignRoleRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)
    target_user = await user_repo.get_by_id(user_id)
    if not target_user or target_user.role != "admin":
        raise HTTPException(status_code=404, detail="Admin user not found")
    if req.admin_role_id is not None:
        role_repo = AdminRoleRepository(db)
        role = await role_repo.get_by_id(req.admin_role_id)
        if not role or not role.is_active:
            raise HTTPException(status_code=400, detail="Role not found")
    await user_repo.update(user_id, admin_role_id=req.admin_role_id)
    return {"success": True}


class AssignRoleByRoleRequest(BaseModel):
    user_id: int
    admin_role_id: int | None = None  # None = unassign


@router.put("/assign")
async def assign_role_to_user(req: AssignRoleByRoleRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Admin assigns a role to another admin user. One person per role."""
    user_repo = UserRepository(db)
    target_user = await user_repo.get_by_id(req.user_id)
    if not target_user or target_user.role != "admin":
        raise HTTPException(status_code=400, detail="User not found or not an admin")

    if req.admin_role_id is not None:
        role_repo = AdminRoleRepository(db)
        role = await role_repo.get_by_id(req.admin_role_id)
        if not role or not role.is_active:
            raise HTTPException(status_code=400, detail="Role not found")

        # Remove this role from anyone else who has it (one person per role)
        stmt = sa_update(User).where(
            User.admin_role_id == req.admin_role_id, User.id != req.user_id
        ).values(admin_role_id=None)
        await db.execute(stmt)

    updated = await user_repo.update(req.user_id, admin_role_id=req.admin_role_id)
    return {
        "success": True,
        "data": {
            "id": updated.id,
            "name": updated.name,
            "admin_role_id": updated.admin_role_id,
        },
    }


security = HTTPBearer(auto_error=False)


@router.get("/contacts")
async def get_role_contacts(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """
    For all authenticated users (admin/coach/player/parent).
    Returns list of admin roles with assigned person's name, phone, email.
    Only returns roles that have someone assigned.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    stmt = (
        select(User)
        .where(User.role == "admin", User.admin_role_id.isnot(None), User.is_active == True)
        .options(selectinload(User.admin_role))
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "role_name": u.admin_role.name if u.admin_role else None,
                "role_id": u.admin_role_id,
                "user_id": u.id,
                "name": u.name,
                "phone": u.phone,
                "email": u.email,
            }
            for u in users
        ],
    }
