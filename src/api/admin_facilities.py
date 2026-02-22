"""HOOPS AI - Admin Facilities API"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.api.admin_auth import get_current_admin
from src.repositories.facility_repository import FacilityRepository
from src.models.user import User

router = APIRouter(prefix="/api/admin/facilities", tags=["admin-facilities"])


class FacilityRequest(BaseModel):
    name: str
    facility_type: str
    address: str | None = None
    capacity: int | None = None
    notes: str | None = None


def _fac_to_dict(f):
    return {
        "id": f.id,
        "name": f.name,
        "facility_type": f.facility_type,
        "address": f.address,
        "capacity": f.capacity,
        "notes": f.notes,
    }


@router.get("")
async def list_facilities(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = FacilityRepository(db)
    facilities = await repo.get_by_admin_id(admin.id)
    return {"success": True, "data": [_fac_to_dict(f) for f in facilities]}


@router.post("")
async def create_facility(req: FacilityRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    if req.facility_type not in ("gym", "court", "field", "pool"):
        raise HTTPException(status_code=400, detail="Invalid facility type")
    repo = FacilityRepository(db)
    fac = await repo.create(admin_id=admin.id, name=req.name.strip(), facility_type=req.facility_type,
                            address=req.address, capacity=req.capacity, notes=req.notes)
    return {"success": True, "data": _fac_to_dict(fac)}


@router.put("/{facility_id}")
async def update_facility(facility_id: int, req: FacilityRequest, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = FacilityRepository(db)
    fac = await repo.get_by_id(facility_id)
    if not fac or fac.admin_id != admin.id:
        raise HTTPException(status_code=404, detail="Facility not found")
    updated = await repo.update(facility_id, name=req.name.strip(), facility_type=req.facility_type,
                                address=req.address, capacity=req.capacity, notes=req.notes)
    return {"success": True, "data": _fac_to_dict(updated)}


@router.delete("/{facility_id}")
async def delete_facility(facility_id: int, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    repo = FacilityRepository(db)
    fac = await repo.get_by_id(facility_id)
    if not fac or fac.admin_id != admin.id:
        raise HTTPException(status_code=404, detail="Facility not found")
    await repo.delete(facility_id)
    return {"success": True}
