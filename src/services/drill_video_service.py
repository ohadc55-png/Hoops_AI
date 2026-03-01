"""HOOPS AI - Drill Video Proof Service"""
import os
import uuid
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from config import get_settings
from src.models.drill_assignment import DrillAssignment
from src.models.drill import Drill
from src.models.player import Player
from src.utils.exceptions import NotFoundError, ValidationError, ConflictError

settings = get_settings()


class DrillVideoService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.video_dir = Path(settings.VIDEO_UPLOAD_DIR)
        self.video_dir.mkdir(parents=True, exist_ok=True)

    async def upload_video_proof(
        self, assignment_id: int, player_ids: list[int], file: UploadFile
    ) -> dict:
        """Player uploads video proof for a drill assignment."""
        stmt = select(DrillAssignment).where(
            DrillAssignment.id == assignment_id,
            DrillAssignment.player_id.in_(player_ids),
        )
        result = await self.session.execute(stmt)
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise NotFoundError("Assignment")

        if assignment.status == "approved":
            raise ConflictError("Assignment already approved")

        # Validate file
        ext = Path(file.filename).suffix.lower() if file.filename else ""
        if ext not in settings.VIDEO_ALLOWED_EXTENSIONS:
            raise ValidationError(
                f"File type {ext} not allowed. Allowed: {', '.join(settings.VIDEO_ALLOWED_EXTENSIONS)}"
            )

        content = await file.read()
        if len(content) > settings.VIDEO_MAX_UPLOAD_SIZE:
            raise ValidationError("File too large (max 15MB)")

        # Save file
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = self.video_dir / filename
        with open(filepath, "wb") as f:
            f.write(content)

        # Delete old video if exists
        if assignment.video_url:
            old_filename = assignment.video_url.split("/")[-1]
            old_path = self.video_dir / old_filename
            if old_path.exists():
                old_path.unlink()

        # Update assignment
        assignment.video_url = f"/uploads/videos/{filename}"
        assignment.status = "video_uploaded"
        assignment.coach_feedback = None  # Clear previous feedback on re-upload
        await self.session.flush()

        return {
            "assignment_id": assignment.id,
            "status": assignment.status,
            "video_url": assignment.video_url,
        }

    async def review_video(
        self, assignment_id: int, coach_id: int, action: str, feedback: str | None = None
    ) -> dict:
        """Coach approves or rejects a video submission."""
        stmt = select(DrillAssignment).where(
            DrillAssignment.id == assignment_id,
            DrillAssignment.coach_id == coach_id,
        )
        result = await self.session.execute(stmt)
        assignment = result.scalar_one_or_none()
        if not assignment:
            raise NotFoundError("Assignment")

        if assignment.status != "video_uploaded":
            raise ValidationError(f"Cannot review assignment in '{assignment.status}' status")

        if action == "approve":
            assignment.status = "approved"
            assignment.is_completed = True
            assignment.completed_at = datetime.utcnow()
        elif action == "reject":
            assignment.status = "rejected"
            assignment.is_completed = False
            assignment.completed_at = None
        else:
            raise ValidationError("Action must be 'approve' or 'reject'")

        assignment.coach_feedback = feedback
        await self.session.flush()

        return {
            "assignment_id": assignment.id,
            "status": assignment.status,
            "coach_feedback": assignment.coach_feedback,
        }

    async def get_pending_reviews(self, coach_id: int) -> list[dict]:
        """Get all drill assignments with uploaded videos awaiting coach review."""
        stmt = (
            select(DrillAssignment, Player)
            .join(Player, DrillAssignment.player_id == Player.id)
            .where(
                DrillAssignment.coach_id == coach_id,
                DrillAssignment.status == "video_uploaded",
            )
            .order_by(DrillAssignment.updated_at.desc())
        )
        result = await self.session.execute(stmt)
        rows = result.all()

        assignments = []
        for a, p in rows:
            drill = await self.session.get(Drill, a.drill_id)
            assignments.append({
                "assignment_id": a.id,
                "drill_id": a.drill_id,
                "drill_title": drill.title if drill else "Unknown",
                "player_id": p.id,
                "player_name": p.name,
                "jersey_number": p.jersey_number,
                "video_url": a.video_url,
                "uploaded_at": str(a.updated_at),
            })

        return assignments
