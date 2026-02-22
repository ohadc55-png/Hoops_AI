"""HOOPS AI - Scouting / Video Room API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.utils.database import get_db
from src.api.auth import get_current_coach
from src.api.player_auth import get_current_player
from src.api.admin_auth import get_current_admin
from src.api.parent_auth import get_current_parent
from src.services.scouting_service import ScoutingService
from src.services.cloudinary_service import CloudinaryService
from src.models.coach import Coach
from src.models.user import User
from src.models.team_member import TeamMember
from src.models.player import Player
from src.models.scouting_video import ScoutingVideo
from src.models.video_clip import VideoClip
from src.models.video_annotation import VideoAnnotation
from src.models.team import Team

router = APIRouter(prefix="/api/scouting", tags=["scouting"])


# ─── Pydantic Models ──────────────────────────────────────────

class VideoCreateRequest(BaseModel):
    cloudinary_public_id: str
    cloudinary_url: str
    original_name: str
    file_size: int = 0
    duration_seconds: float | None = None
    title: str = "Untitled Video"
    description: str | None = None
    video_type: str = "game"
    team_id: int | None = None
    opponent: str | None = None
    game_date: str | None = None
    keep_forever: bool = False


class VideoUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    video_type: str | None = None
    opponent: str | None = None
    game_date: str | None = None
    keep_forever: bool | None = None


class ClipCreateRequest(BaseModel):
    start_time: float
    end_time: float
    action_type: str = "other"
    title: str | None = None
    rating: str | None = None
    notes: str | None = None
    player_ids: list[int] = []


class ClipUpdateRequest(BaseModel):
    title: str | None = None
    action_type: str | None = None
    rating: str | None = None
    notes: str | None = None


class AnnotationCreateRequest(BaseModel):
    annotation_type: str
    timestamp: float
    duration: float = 3.0
    stroke_data: dict | None = None
    color: str = "#FF0000"
    stroke_width: int = 3
    text_content: str | None = None
    clip_id: int | None = None


class AnnotationUpdateRequest(BaseModel):
    annotation_type: str | None = None
    timestamp: float | None = None
    duration: float | None = None
    stroke_data: dict | None = None
    color: str | None = None
    stroke_width: int | None = None
    text_content: str | None = None


class ShareRequest(BaseModel):
    team_id: int


class PlayerTagRequest(BaseModel):
    player_id: int


# ─── Serializers ───────────────────────────────────────────────

def video_to_dict(v: ScoutingVideo, clip_count: int = 0) -> dict:
    return {
        "id": v.id,
        "coach_id": v.coach_id,
        "team_id": v.team_id,
        "title": v.title,
        "description": v.description,
        "video_type": v.video_type,
        "cloudinary_public_id": v.cloudinary_public_id,
        "cloudinary_url": v.cloudinary_url,
        "cloudinary_hls_url": v.cloudinary_hls_url,
        "thumbnail_url": v.thumbnail_url,
        "original_name": v.original_name,
        "file_size": v.file_size,
        "duration_seconds": v.duration_seconds,
        "opponent": v.opponent,
        "game_date": v.game_date,
        "shared_with_team": v.shared_with_team,
        "shared_with_parents": getattr(v, "shared_with_parents", False),
        "expires_at": str(v.expires_at) if v.expires_at else None,
        "keep_forever": getattr(v, "keep_forever", False),
        "clip_count": clip_count,
        "created_at": str(v.created_at),
        "updated_at": str(v.updated_at),
    }


def clip_to_dict(c: VideoClip) -> dict:
    player_tags = []
    if hasattr(c, "player_tags") and c.player_tags:
        player_tags = [{"player_id": t.player_id, "name": t.player.name if t.player else ""} for t in c.player_tags]

    watch_count = len(c.views) if hasattr(c, "views") and c.views else 0

    return {
        "id": c.id,
        "video_id": c.video_id,
        "title": c.title,
        "start_time": c.start_time,
        "end_time": c.end_time,
        "action_type": c.action_type,
        "rating": c.rating,
        "notes": c.notes,
        "player_tags": player_tags,
        "watch_count": watch_count,
        "created_at": str(c.created_at),
    }


def annotation_to_dict(a: VideoAnnotation) -> dict:
    return {
        "id": a.id,
        "video_id": a.video_id,
        "clip_id": a.clip_id,
        "annotation_type": a.annotation_type,
        "timestamp": a.timestamp,
        "duration": a.duration,
        "stroke_data": a.stroke_data,
        "color": a.color,
        "stroke_width": a.stroke_width,
        "text_content": a.text_content,
    }


# ─── Helper ────────────────────────────────────────────────────

async def _get_player_team_ids(db: AsyncSession, user: User) -> tuple[list[int], list[int]]:
    """Returns (team_ids, player_ids) for a player user."""
    stmt = select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.is_active == True)
    result = await db.execute(stmt)
    memberships = result.scalars().all()
    team_ids = [m.team_id for m in memberships]
    player_ids = [m.player_id for m in memberships if m.player_id]
    return team_ids, player_ids


# ═══════════════════════════════════════════════════════════════
#  COACH ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/upload-config")
async def get_upload_config(coach: Coach = Depends(get_current_coach)):
    """Return Cloudinary config for browser direct upload."""
    svc = CloudinaryService()
    return {"success": True, "data": svc.get_upload_config()}


@router.post("/videos")
async def create_video(
    req: VideoCreateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """Register a video after successful Cloudinary upload."""
    from src.utils.feature_gate import require_feature
    await require_feature("video_room", db, coach_id=coach.id)
    svc = ScoutingService(db)
    try:
        video = await svc.register_video(coach.id, req.team_id, req.model_dump())
        return {"success": True, "data": video_to_dict(video)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/videos")
async def list_videos(
    video_type: str | None = Query(None),
    team_id: int | None = Query(None),
    search: str | None = Query(None),
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """List coach's videos with optional filters."""
    svc = ScoutingService(db)
    videos = await svc.get_videos(coach.id, video_type, team_id, search)

    # Get clip counts
    data = []
    for v in videos:
        clips = await svc.get_clips(v.id)
        data.append(video_to_dict(v, clip_count=len(clips)))

    return {"success": True, "data": data}


@router.get("/videos/{video_id}")
async def get_video(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """Get video detail with clips and annotations."""
    svc = ScoutingService(db)
    video = await svc.get_video_detail(video_id)
    if not video or video.coach_id != coach.id:
        raise HTTPException(status_code=404, detail="Video not found")

    clips_data = [clip_to_dict(c) for c in (video.clips or [])]
    annotations_data = [annotation_to_dict(a) for a in (video.annotations or [])]

    result = video_to_dict(video, clip_count=len(clips_data))
    result["clips"] = clips_data
    result["annotations"] = annotations_data

    return {"success": True, "data": result}


@router.put("/videos/{video_id}")
async def update_video(
    video_id: int,
    req: VideoUpdateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    video = await svc.update_video(video_id, coach.id, req.model_dump(exclude_none=True))
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True, "data": video_to_dict(video)}


@router.delete("/videos/{video_id}")
async def delete_video(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.delete_video(video_id, coach.id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True}


@router.post("/videos/{video_id}/share")
async def share_video(
    video_id: int,
    req: ShareRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.share_video(video_id, coach.id, req.team_id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True}


@router.post("/videos/{video_id}/unshare")
async def unshare_video(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.unshare_video(video_id, coach.id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True}


@router.post("/videos/{video_id}/share-parents")
async def share_video_with_parents(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """Share video with parents (requires sharing with team first)."""
    svc = ScoutingService(db)
    if not await svc.share_video_with_parents(video_id, coach.id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True}


@router.post("/videos/{video_id}/unshare-parents")
async def unshare_video_with_parents(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.unshare_video_with_parents(video_id, coach.id):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"success": True}


# ─── Clips ─────────────────────────────────────────────────────

@router.post("/videos/{video_id}/clips")
async def create_clip(
    video_id: int,
    req: ClipCreateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    try:
        clip = await svc.create_clip(video_id, coach.id, req.model_dump())
        return {"success": True, "data": clip_to_dict(clip)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/videos/{video_id}/clips")
async def list_clips(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    clips = await svc.get_clips(video_id)
    return {"success": True, "data": [clip_to_dict(c) for c in clips]}


@router.put("/clips/{clip_id}")
async def update_clip(
    clip_id: int,
    req: ClipUpdateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    clip = await svc.update_clip(clip_id, coach.id, req.model_dump(exclude_none=True))
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return {"success": True, "data": clip_to_dict(clip)}


@router.delete("/clips/{clip_id}")
async def delete_clip(
    clip_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.delete_clip(clip_id, coach.id):
        raise HTTPException(status_code=404, detail="Clip not found")
    return {"success": True}


@router.post("/clips/{clip_id}/players")
async def add_player_tag(
    clip_id: int,
    req: PlayerTagRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.add_player_tag(clip_id, coach.id, req.player_id):
        raise HTTPException(status_code=400, detail="Could not tag player")
    return {"success": True}


@router.delete("/clips/{clip_id}/players/{player_id}")
async def remove_player_tag(
    clip_id: int,
    player_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.remove_player_tag(clip_id, coach.id, player_id):
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"success": True}


# ─── Annotations / Telestrator ─────────────────────────────────

@router.post("/videos/{video_id}/annotations")
async def create_annotation(
    video_id: int,
    req: AnnotationCreateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    ann = await svc.save_annotation(video_id, coach.id, req.model_dump())
    return {"success": True, "data": annotation_to_dict(ann)}


@router.get("/videos/{video_id}/annotations")
async def list_annotations(
    video_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    anns = await svc.get_annotations(video_id)
    return {"success": True, "data": [annotation_to_dict(a) for a in anns]}


@router.put("/annotations/{ann_id}")
async def update_annotation(
    ann_id: int,
    req: AnnotationUpdateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    ann = await svc.update_annotation(ann_id, coach.id, req.model_dump(exclude_none=True))
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True, "data": annotation_to_dict(ann)}


@router.delete("/annotations/{ann_id}")
async def delete_annotation(
    ann_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    if not await svc.delete_annotation(ann_id, coach.id):
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}


# ─── Quota ─────────────────────────────────────────────────────

@router.get("/quota")
async def get_quota(
    team_id: int = Query(...),
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    data = await svc.get_quota(team_id)
    return {"success": True, "data": data}


# ─── Coach roster helper ───────────────────────────────────────

@router.get("/players")
async def get_roster(
    team_id: int | None = Query(None),
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    """Get roster for player tagging (quick endpoint)."""
    stmt = select(Player).where(Player.coach_id == coach.id).order_by(Player.name)
    result = await db.execute(stmt)
    players = result.scalars().all()
    return {
        "success": True,
        "data": [
            {"id": p.id, "name": p.name, "jersey_number": p.jersey_number, "position": p.position}
            for p in players
        ],
    }


# ═══════════════════════════════════════════════════════════════
#  PLAYER ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/player/feed")
async def player_feed(
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Player's personalized clip feed."""
    team_ids, player_ids = await _get_player_team_ids(db, user)
    if not player_ids:
        return {"success": True, "data": []}

    svc = ScoutingService(db)
    clips = await svc.get_player_feed(player_ids[0], team_ids)

    # Enrich with video info
    data = []
    for clip in clips:
        video = await svc.video_repo.get_by_id(clip.video_id)
        if not video:
            continue

        is_watched = await svc.view_repo.has_watched(clip.id, user.id)

        d = clip_to_dict(clip)
        d["video_title"] = video.title
        d["video_type"] = video.video_type
        d["opponent"] = video.opponent
        d["cloudinary_url"] = video.cloudinary_url
        d["cloudinary_hls_url"] = video.cloudinary_hls_url
        d["thumbnail_url"] = video.thumbnail_url
        d["cloudinary_public_id"] = video.cloudinary_public_id
        d["is_watched"] = is_watched
        data.append(d)

    return {"success": True, "data": data}


@router.get("/player/clips/{clip_id}")
async def player_clip_detail(
    clip_id: int,
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    """Get single clip detail with annotations for player view."""
    import traceback
    try:
        svc = ScoutingService(db)
        detail = await svc.get_clip_detail(clip_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Clip not found")

        clip = detail["clip"]
        video = detail["video"]
        annotations = detail["annotations"]

        result = clip_to_dict(clip)
        result["video_title"] = video.title if video else ""
        result["cloudinary_url"] = video.cloudinary_url if video else ""
        result["cloudinary_hls_url"] = video.cloudinary_hls_url if video else ""
        result["cloudinary_public_id"] = video.cloudinary_public_id if video else ""
        result["annotations"] = [annotation_to_dict(a) for a in annotations]
        result["is_watched"] = await svc.view_repo.has_watched(clip_id, user.id)

        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[SCOUTING ERROR] player_clip_detail: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/player/clips/{clip_id}/watched")
async def mark_watched(
    clip_id: int,
    user: User = Depends(get_current_player),
    db: AsyncSession = Depends(get_db),
):
    svc = ScoutingService(db)
    await svc.mark_watched(clip_id, user.id)
    return {"success": True}


# ═══════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════

async def _get_admin_team_and_coach_ids(db: AsyncSession, admin: User) -> tuple[list[int], list[int]]:
    """Return (team_ids, coach_ids) for admin's teams."""
    stmt = select(Team.id).where(Team.created_by_admin_id == admin.id)
    result = await db.execute(stmt)
    team_ids = [row[0] for row in result.all()]
    # Get coach IDs that belong to these teams
    if team_ids:
        stmt2 = (
            select(TeamMember.user_id)
            .where(TeamMember.team_id.in_(team_ids), TeamMember.role_in_team == "coach", TeamMember.is_active == True)
        )
        result2 = await db.execute(stmt2)
        user_ids = [row[0] for row in result2.all()]
        # Resolve user_ids → coach_ids
        if user_ids:
            from src.models.coach import Coach as CoachModel
            stmt3 = select(CoachModel.id).where(CoachModel.user_id.in_(user_ids))
            result3 = await db.execute(stmt3)
            coach_ids = [row[0] for row in result3.all()]
        else:
            coach_ids = []
    else:
        coach_ids = []
    return team_ids, coach_ids


@router.get("/admin/teams")
async def admin_scouting_teams(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list teams for team picker dropdown."""
    stmt = select(Team).where(Team.created_by_admin_id == admin.id).order_by(Team.name)
    result = await db.execute(stmt)
    teams = result.scalars().all()
    return {"success": True, "data": [{"id": t.id, "name": t.name} for t in teams]}


@router.get("/admin/videos")
async def admin_list_videos(
    team_id: int | None = Query(None),
    video_type: str | None = Query(None),
    search: str | None = Query(None),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all videos across their teams."""
    admin_team_ids, admin_coach_ids = await _get_admin_team_and_coach_ids(db, admin)
    if not admin_team_ids:
        return {"success": True, "data": []}

    filter_ids = [team_id] if team_id and team_id in admin_team_ids else admin_team_ids
    svc = ScoutingService(db)
    videos = await svc.get_videos_for_teams(filter_ids, admin_coach_ids, video_type, search)

    data = []
    coach_name_cache = {}
    for v in videos:
        clips = await svc.get_clips(v.id)
        d = video_to_dict(v, clip_count=len(clips))
        # Add coach name
        if v.coach_id not in coach_name_cache:
            coach = await db.get(Coach, v.coach_id)
            coach_name_cache[v.coach_id] = coach.name if coach else "Unknown"
        d["coach_name"] = coach_name_cache[v.coach_id]
        data.append(d)

    return {"success": True, "data": data}


@router.get("/admin/videos/{video_id}")
async def admin_get_video(
    video_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: get video detail with clips and annotations (read-only)."""
    admin_team_ids, admin_coach_ids = await _get_admin_team_and_coach_ids(db, admin)
    svc = ScoutingService(db)
    video = await svc.get_video_detail_for_admin(video_id, admin_team_ids, admin_coach_ids)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    clips_data = [clip_to_dict(c) for c in (video.clips or [])]
    annotations_data = [annotation_to_dict(a) for a in (video.annotations or [])]

    coach = await db.get(Coach, video.coach_id)
    result = video_to_dict(video, clip_count=len(clips_data))
    result["clips"] = clips_data
    result["annotations"] = annotations_data
    result["coach_name"] = coach.name if coach else "Unknown"

    return {"success": True, "data": result}


# ═══════════════════════════════════════════════════════════════
#  PARENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════

async def _get_parent_team_ids(db: AsyncSession, user: User) -> tuple[list[int], list[int]]:
    """Returns (team_ids, player_ids) for a parent user."""
    stmt = select(TeamMember).where(TeamMember.user_id == user.id, TeamMember.is_active == True)
    result = await db.execute(stmt)
    memberships = result.scalars().all()
    team_ids = [m.team_id for m in memberships]
    player_ids = [m.player_id for m in memberships if m.player_id]
    return team_ids, player_ids


@router.get("/parent/feed")
async def parent_feed(
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Parent's video clip feed (only parent-shared videos)."""
    team_ids, player_ids = await _get_parent_team_ids(db, user)
    if not team_ids:
        return {"success": True, "data": []}

    svc = ScoutingService(db)
    child_id = player_ids[0] if player_ids else None
    clips = await svc.get_parent_feed(child_id, team_ids)

    data = []
    for clip in clips:
        video = await svc.video_repo.get_by_id(clip.video_id)
        if not video:
            continue
        d = clip_to_dict(clip)
        d["video_title"] = video.title
        d["video_type"] = video.video_type
        d["opponent"] = video.opponent
        d["cloudinary_url"] = video.cloudinary_url
        d["cloudinary_hls_url"] = video.cloudinary_hls_url
        d["thumbnail_url"] = video.thumbnail_url
        d["cloudinary_public_id"] = video.cloudinary_public_id
        data.append(d)

    return {"success": True, "data": data}


@router.get("/parent/clips/{clip_id}")
async def parent_clip_detail(
    clip_id: int,
    user: User = Depends(get_current_parent),
    db: AsyncSession = Depends(get_db),
):
    """Get single clip detail with annotations for parent view."""
    svc = ScoutingService(db)
    detail = await svc.get_clip_detail(clip_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Clip not found")

    clip = detail["clip"]
    video = detail["video"]
    annotations = detail["annotations"]

    result = clip_to_dict(clip)
    result["video_title"] = video.title if video else ""
    result["cloudinary_url"] = video.cloudinary_url if video else ""
    result["cloudinary_hls_url"] = video.cloudinary_hls_url if video else ""
    result["cloudinary_public_id"] = video.cloudinary_public_id if video else ""
    result["annotations"] = [annotation_to_dict(a) for a in annotations]

    return {"success": True, "data": result}
