"""HOOPS AI - Club-side Feature Flags API (any role)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.utils.database import get_db
from src.utils.feature_gate import get_club_id_for_user, check_feature
from src.models.club_feature_flag import FEATURE_KEYS

router = APIRouter(prefix="/api/features", tags=["features"])


async def _get_any_user(credentials=Depends(__import__('fastapi.security', fromlist=['HTTPBearer']).HTTPBearer(auto_error=False)), db: AsyncSession = Depends(get_db)):
    """Lightweight auth: decode any valid token to get user_id."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from src.services.auth_service import decode_token
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


@router.get("/my")
async def get_my_features(
    payload: dict = Depends(_get_any_user),
    db: AsyncSession = Depends(get_db),
):
    """Return feature flags for the current user's club."""
    user_id = int(payload.get("sub", 0))
    club_id = await get_club_id_for_user(user_id, db)

    flags = {}
    for key in FEATURE_KEYS:
        flags[key] = await check_feature(key, club_id, db)
    return {"success": True, "data": flags}


@router.get("/check/{key}")
async def check_single_feature(
    key: str,
    payload: dict = Depends(_get_any_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if a specific feature is enabled for the current user's club."""
    if key not in FEATURE_KEYS:
        raise HTTPException(status_code=400, detail=f"Unknown feature key: {key}")
    user_id = int(payload.get("sub", 0))
    club_id = await get_club_id_for_user(user_id, db)
    enabled = await check_feature(key, club_id, db)
    return {"success": True, "data": {"feature_key": key, "is_enabled": enabled}}
