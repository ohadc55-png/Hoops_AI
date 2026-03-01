"""HOOPS AI - Scouting / Video Room API"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)
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
    video = await svc.register_video(coach.id, req.team_id, req.model_dump())
    return {"success": True, "data": video_to_dict(video)}


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
    clip = await svc.create_clip(video_id, coach.id, req.model_dump())
    return {"success": True, "data": clip_to_dict(clip)}


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
#  PLAYLISTS (Phase 3.1)
# ═══════════════════════════════════════════════════════════════

class PlaylistCreateRequest(BaseModel):
    name: str
    description: str | None = None
    team_id: int | None = None

class PlaylistUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None

class PlaylistReorderRequest(BaseModel):
    item_ids: list[int]

class PlaylistItemAddRequest(BaseModel):
    clip_id: int
    note: str | None = None

class PlaylistShareRequest(BaseModel):
    team_id: int
    share_with_parents: bool = False

class BatchClipRequest(BaseModel):
    clip_ids: list[int]

class BatchClipUpdateRequest(BaseModel):
    clip_ids: list[int]
    rating: str | None = None

def playlist_to_dict(p):
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "team_id": p.team_id, "shared_with_team": p.shared_with_team,
        "shared_with_parents": p.shared_with_parents,
        "item_count": len(p.items) if p.items else 0,
        "items": [
            {"id": i.id, "clip_id": i.clip_id, "sort_order": i.sort_order, "note": i.note}
            for i in (p.items or [])
        ],
    }

@router.post("/playlists")
async def create_playlist(
    req: PlaylistCreateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    pl = ClipPlaylist(coach_id=coach.id, name=req.name, description=req.description, team_id=req.team_id)
    db.add(pl)
    await db.flush()
    await db.refresh(pl)
    return {"data": {"id": pl.id, "name": pl.name}}

@router.get("/playlists")
async def list_playlists(
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.coach_id == coach.id)
        .options(selectinload(ClipPlaylist.items))
        .order_by(ClipPlaylist.created_at.desc())
    )
    return {"data": [playlist_to_dict(p) for p in result.scalars().all()]}

@router.get("/playlists/{playlist_id}")
async def get_playlist(
    playlist_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
        .options(selectinload(ClipPlaylist.items))
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    return {"data": playlist_to_dict(pl)}

@router.delete("/playlists/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    await db.delete(pl)
    return {"message": "Deleted"}

@router.post("/playlists/{playlist_id}/items")
async def add_playlist_item(
    playlist_id: int,
    req: PlaylistItemAddRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist, PlaylistItem
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
        .options(selectinload(ClipPlaylist.items))
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    max_order = max((i.sort_order for i in pl.items), default=-1) + 1
    item = PlaylistItem(playlist_id=playlist_id, clip_id=req.clip_id, sort_order=max_order, note=req.note)
    db.add(item)
    await db.flush()
    return {"data": {"id": item.id, "clip_id": item.clip_id, "sort_order": item.sort_order}}

@router.delete("/playlists/{playlist_id}/items/{item_id}")
async def remove_playlist_item(
    playlist_id: int, item_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist, PlaylistItem
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Playlist not found")
    item_result = await db.execute(select(PlaylistItem).where(PlaylistItem.id == item_id, PlaylistItem.playlist_id == playlist_id))
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    return {"message": "Removed"}

@router.put("/playlists/{playlist_id}/reorder")
async def reorder_playlist(
    playlist_id: int,
    req: PlaylistReorderRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist, PlaylistItem
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
        .options(selectinload(ClipPlaylist.items))
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    item_map = {i.id: i for i in pl.items}
    for idx, item_id in enumerate(req.item_ids):
        if item_id in item_map:
            item_map[item_id].sort_order = idx
    return {"message": "Reordered"}

@router.post("/playlists/{playlist_id}/share")
async def share_playlist(
    playlist_id: int,
    req: PlaylistShareRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    pl.shared_with_team = True
    pl.team_id = req.team_id
    pl.shared_with_parents = req.share_with_parents
    return {"message": "Shared"}

@router.post("/playlists/{playlist_id}/unshare")
async def unshare_playlist(
    playlist_id: int,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    pl.shared_with_team = False
    pl.shared_with_parents = False
    return {"message": "Unshared"}

# ─── Advanced Search (Phase 3.2) ──────────────────────────────

@router.get("/clips/search")
async def search_clips(
    action_type: str | None = None,
    rating: str | None = None,
    player_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    opponent: str | None = None,
    search: str | None = None,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    from src.models.clip_player_tag import ClipPlayerTag
    query = select(VideoClip).join(ScoutingVideo).where(ScoutingVideo.coach_id == coach.id)
    if action_type:
        query = query.where(VideoClip.action_type == action_type)
    if rating:
        query = query.where(VideoClip.rating == rating)
    if player_id:
        query = query.join(ClipPlayerTag).where(ClipPlayerTag.player_id == player_id)
    if date_from:
        query = query.where(ScoutingVideo.game_date >= date_from)
    if date_to:
        query = query.where(ScoutingVideo.game_date <= date_to)
    if opponent:
        query = query.where(ScoutingVideo.opponent.ilike(f"%{opponent}%"))
    if search:
        query = query.where(VideoClip.notes.ilike(f"%{search}%"))
    query = query.options(selectinload(VideoClip.player_tags), selectinload(VideoClip.views))
    query = query.order_by(VideoClip.created_at.desc()).limit(100)
    result = await db.execute(query)
    clips = result.scalars().unique().all()
    # Enrich with video info
    data = []
    for c in clips:
        d = clip_to_dict(c)
        d["video_id"] = c.video_id
        data.append(d)
    return {"data": data}

# ─── Batch Clip Operations (Phase 3.3) ────────────────────────

@router.post("/clips/batch-delete")
async def batch_delete_clips(
    req: BatchClipRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    for cid in req.clip_ids:
        result = await db.execute(select(VideoClip).where(VideoClip.id == cid, VideoClip.coach_id == coach.id))
        clip = result.scalar_one_or_none()
        if clip:
            await db.delete(clip)
    return {"message": f"Deleted {len(req.clip_ids)} clips"}

@router.post("/clips/batch-update")
async def batch_update_clips(
    req: BatchClipUpdateRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    for cid in req.clip_ids:
        result = await db.execute(select(VideoClip).where(VideoClip.id == cid, VideoClip.coach_id == coach.id))
        clip = result.scalar_one_or_none()
        if clip and req.rating is not None:
            clip.rating = req.rating
    return {"message": f"Updated {len(req.clip_ids)} clips"}

@router.post("/playlists/{playlist_id}/batch-add")
async def batch_add_to_playlist(
    playlist_id: int,
    req: BatchClipRequest,
    coach: Coach = Depends(get_current_coach),
    db: AsyncSession = Depends(get_db),
):
    from src.models.clip_playlist import ClipPlaylist, PlaylistItem
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(ClipPlaylist).where(ClipPlaylist.id == playlist_id, ClipPlaylist.coach_id == coach.id)
        .options(selectinload(ClipPlaylist.items))
    )
    pl = result.scalar_one_or_none()
    if not pl:
        raise HTTPException(404, "Playlist not found")
    max_order = max((i.sort_order for i in pl.items), default=-1)
    for i, cid in enumerate(req.clip_ids):
        item = PlaylistItem(playlist_id=playlist_id, clip_id=cid, sort_order=max_order + 1 + i)
        db.add(item)
    return {"message": f"Added {len(req.clip_ids)} clips"}


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
    logger.debug(f"Player feed: user={user.id} ({user.email}), team_ids={team_ids}, player_ids={player_ids}")
    if not player_ids:
        logger.debug(f"Player feed empty - no player_ids for user {user.id}")
        return {"success": True, "data": []}

    svc = ScoutingService(db)
    # Debug: show shared videos for these teams
    from sqlalchemy import select as _sel
    _shared = await db.execute(_sel(ScoutingVideo).where(ScoutingVideo.shared_with_team == True))
    _svids = _shared.scalars().all()
    logger.debug(f"Player feed shared videos: {[(v.id, v.title[:30], f'team={v.team_id}') for v in _svids]}")
    clips = await svc.get_player_feed(player_ids[0], team_ids)
    logger.debug(f"Player feed found {len(clips)} clips for player {player_ids[0]}")

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
        logger.error(f"player_clip_detail error: {e}", exc_info=True)
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
    logger.debug(f"Parent feed: user={user.id} ({user.email}), team_ids={team_ids}, player_ids={player_ids}")
    if not team_ids:
        logger.debug(f"Parent feed empty - no team_ids for user {user.id}")
        return {"success": True, "data": []}

    svc = ScoutingService(db)
    child_id = player_ids[0] if player_ids else None
    clips = await svc.get_parent_feed(child_id, team_ids)
    logger.debug(f"Parent feed found {len(clips)} clips for child={child_id}")

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
