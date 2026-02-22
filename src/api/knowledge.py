"""HOOPS AI - Knowledge Base API"""
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.utils.database import get_db, AsyncSessionLocal
from src.models.user import User
from src.models.coach import Coach
from src.models.team import Team
from src.models.team_member import TeamMember
from src.models.knowledge_document import KnowledgeDocument
from src.repositories.knowledge_repository import KnowledgeRepository
from src.services.rag.rag_service import RAGService
from src.services.rag.vector_store import get_collection_stats
from src.services.auth_service import decode_token
from src.constants.rag_categories import DOCUMENT_CATEGORIES
from config import get_settings

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
security = HTTPBearer(auto_error=False)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


async def get_current_uploader(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Auth guard: accepts admin or coach tokens.

    Admin tokens have role='admin', sub=User.id.
    Coach tokens have NO role claim, sub=Coach.id (legacy).
    We resolve the coach → user via Coach.user_id FK.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub_id = int(payload.get("sub", 0))
    role = payload.get("role", "")

    if role == "admin":
        user = await db.get(User, sub_id)
        if not user or user.role != "admin":
            raise HTTPException(status_code=401, detail="Invalid admin token")
        return user

    if role and role not in ("admin", "coach"):
        raise HTTPException(status_code=403, detail="Only admins and coaches can manage knowledge")

    # No role or role='coach' → sub is Coach.id
    coach = await db.get(Coach, sub_id)
    if not coach:
        raise HTTPException(status_code=401, detail="Coach not found")
    if not coach.user_id:
        raise HTTPException(status_code=403, detail="Coach not linked to a user account")
    user = await db.get(User, coach.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _doc_to_dict(doc: KnowledgeDocument) -> dict:
    return {
        "id": doc.id,
        "scope": doc.scope,
        "uploaded_by_id": doc.uploaded_by_id,
        "uploaded_by_role": doc.uploaded_by_role,
        "title": doc.title,
        "description": doc.description,
        "category": doc.category,
        "language": doc.language,
        "original_name": doc.original_name,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "status": doc.status,
        "chunk_count": doc.chunk_count,
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


@router.get("/categories")
async def list_categories():
    """Return available document categories."""
    return {"success": True, "data": DOCUMENT_CATEGORIES}


@router.get("")
async def list_documents(
    category: str | None = None,
    status: str | None = None,
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    """List knowledge documents visible to this user."""
    repo = KnowledgeRepository(db)

    if user.role == "admin":
        docs = await repo.get_for_admin(user.id, category=category, status=status)
    else:
        # Coach: resolve admin_ids from teams
        admin_ids = await _get_coach_admin_ids(db, user.id)
        docs = await repo.get_for_coach(user.id, admin_ids=admin_ids, category=category, status=status)

    return {"success": True, "data": [_doc_to_dict(d) for d in docs]}


@router.get("/stats")
async def knowledge_stats(
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    repo = KnowledgeRepository(db)
    doc_count = await repo.count_ready(user.id)
    vector_stats = await get_collection_stats()
    return {
        "success": True,
        "data": {
            "my_documents": doc_count,
            "total_chunks": vector_stats["total_chunks"],
        },
    }


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    language: str = Form("en"),
    description: str = Form(None),
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    from src.utils.feature_gate import require_feature
    await require_feature("knowledge_base", db, user_id=user.id)
    # Validate file
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use PDF, DOCX, or TXT.")

    if category not in DOCUMENT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    # Save file
    knowledge_dir = Path(settings.KNOWLEDGE_UPLOAD_DIR)
    knowledge_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = knowledge_dir / filename
    with open(file_path, "wb") as f:
        f.write(content)

    # Determine scope
    scope = "club" if user.role == "admin" else "coach"

    # Create DB record
    repo = KnowledgeRepository(db)
    doc = await repo.create(
        scope=scope,
        uploaded_by_id=user.id,
        uploaded_by_role=user.role,
        filename=filename,
        original_name=file.filename,
        file_path=str(file_path),
        file_type=ext.lstrip("."),
        file_size=len(content),
        title=title.strip(),
        description=description.strip() if description else None,
        category=category,
        language=language,
        status="processing",
    )
    await db.commit()

    # Process in background
    background_tasks.add_task(_process_document, doc.id)

    return {"success": True, "data": _doc_to_dict(doc)}


async def _process_document(document_id: int):
    """Background task: extract text, chunk, embed, store in ChromaDB."""
    async with AsyncSessionLocal() as session:
        try:
            repo = KnowledgeRepository(session)
            doc = await repo.get_by_id(document_id)
            if not doc:
                return

            rag_svc = RAGService()
            chunk_count = await rag_svc.process_document(
                document_id=doc.id,
                file_path=doc.file_path,
                metadata={
                    "scope": doc.scope,
                    "uploaded_by_id": doc.uploaded_by_id or 0,
                    "category": doc.category,
                    "language": doc.language,
                    "title": doc.title,
                },
            )

            doc.status = "ready"
            doc.chunk_count = chunk_count
            await session.commit()

        except Exception as e:
            doc.status = "error"
            doc.error_message = str(e)[:500]
            await session.commit()


@router.post("/{document_id}/retry")
async def retry_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    repo = KnowledgeRepository(db)
    doc = await repo.get_by_id(document_id)
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.uploaded_by_id != user.id and doc.scope != "system":
        raise HTTPException(status_code=403, detail="Not authorized")
    if doc.status != "error":
        raise HTTPException(status_code=400, detail="Can only retry failed documents")

    # Clean up partial chunks
    rag_svc = RAGService()
    await rag_svc.delete_document(document_id)

    doc.status = "processing"
    doc.error_message = None
    await db.commit()

    background_tasks.add_task(_process_document, document_id)
    return {"success": True, "data": _doc_to_dict(doc)}


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: int,
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    """Return extracted text preview of a document (first ~5000 chars)."""
    repo = KnowledgeRepository(db)
    doc = await repo.get_by_id(document_id)
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    try:
        from src.services.rag.document_processor import extract_text
        pages = extract_text(str(file_path))
        full_text = "\n\n".join(p["text"] for p in pages)
        preview = full_text[:5000]
        if len(full_text) > 5000:
            preview += "\n\n... (truncated)"
        return {"success": True, "data": {"text": preview, "total_chars": len(full_text)}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not extract text: {str(e)[:200]}")


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    """Download the original uploaded file."""
    repo = KnowledgeRepository(db)
    doc = await repo.get_by_id(document_id)
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
    }
    media_type = media_types.get(doc.file_type, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        filename=doc.original_name,
        media_type=media_type,
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    user: User = Depends(get_current_uploader),
    db: AsyncSession = Depends(get_db),
):
    repo = KnowledgeRepository(db)
    doc = await repo.get_by_id(document_id)
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.uploaded_by_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if doc.scope == "system":
        raise HTTPException(status_code=403, detail="Cannot delete system documents via API")

    # Remove from ChromaDB
    rag_svc = RAGService()
    await rag_svc.delete_document(document_id)

    # Soft delete in DB
    doc.is_active = False
    await db.commit()

    # Delete file
    try:
        Path(doc.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    return {"success": True}


async def _get_coach_admin_ids(db: AsyncSession, coach_user_id: int) -> list[int]:
    """Resolve admin IDs from coach's team memberships."""
    stmt = (
        select(Team.created_by_admin_id)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(
            TeamMember.user_id == coach_user_id,
            TeamMember.is_active == True,
        )
        .distinct()
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all() if row[0]]
