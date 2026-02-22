"""HOOPS AI - Knowledge Document Repository"""
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.base_repository import BaseRepository
from src.models.knowledge_document import KnowledgeDocument


class KnowledgeRepository(BaseRepository[KnowledgeDocument]):
    def __init__(self, session: AsyncSession):
        super().__init__(KnowledgeDocument, session)

    async def get_by_uploader(
        self,
        uploaded_by_id: int,
        category: str | None = None,
        status: str | None = None,
    ) -> list[KnowledgeDocument]:
        """Get documents uploaded by a specific user."""
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.uploaded_by_id == uploaded_by_id,
                KnowledgeDocument.is_active == True,
            )
            .order_by(KnowledgeDocument.created_at.desc())
        )
        if category:
            stmt = stmt.where(KnowledgeDocument.category == category)
        if status:
            stmt = stmt.where(KnowledgeDocument.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_system_docs(
        self,
        category: str | None = None,
        status: str | None = None,
    ) -> list[KnowledgeDocument]:
        """Get all system-scope documents."""
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.scope == "system",
                KnowledgeDocument.is_active == True,
            )
            .order_by(KnowledgeDocument.created_at.desc())
        )
        if category:
            stmt = stmt.where(KnowledgeDocument.category == category)
        if status:
            stmt = stmt.where(KnowledgeDocument.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_admin(
        self,
        admin_id: int,
        category: str | None = None,
        status: str | None = None,
    ) -> list[KnowledgeDocument]:
        """Admin view: own club docs + system docs."""
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.is_active == True,
                or_(
                    KnowledgeDocument.uploaded_by_id == admin_id,
                    KnowledgeDocument.scope == "system",
                ),
            )
            .order_by(KnowledgeDocument.scope.asc(), KnowledgeDocument.created_at.desc())
        )
        if category:
            stmt = stmt.where(KnowledgeDocument.category == category)
        if status:
            stmt = stmt.where(KnowledgeDocument.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_for_coach(
        self,
        coach_user_id: int,
        admin_ids: list[int] | None = None,
        category: str | None = None,
        status: str | None = None,
    ) -> list[KnowledgeDocument]:
        """Coach view: own docs + club docs (from admins) + system docs."""
        conditions = [
            KnowledgeDocument.uploaded_by_id == coach_user_id,
            KnowledgeDocument.scope == "system",
        ]
        if admin_ids:
            conditions.append(
                (KnowledgeDocument.uploaded_by_id.in_(admin_ids))
                & (KnowledgeDocument.scope == "club")
            )
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.is_active == True,
                or_(*conditions),
            )
            .order_by(KnowledgeDocument.scope.asc(), KnowledgeDocument.created_at.desc())
        )
        if category:
            stmt = stmt.where(KnowledgeDocument.category == category)
        if status:
            stmt = stmt.where(KnowledgeDocument.status == status)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_original_name_and_scope(
        self, original_name: str, scope: str
    ) -> KnowledgeDocument | None:
        """Find document by original filename and scope (for seed dedup)."""
        stmt = select(KnowledgeDocument).where(
            KnowledgeDocument.original_name == original_name,
            KnowledgeDocument.scope == scope,
            KnowledgeDocument.is_active == True,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_ready(self, uploaded_by_id: int | None = None) -> int:
        """Count ready documents, optionally filtered by uploader."""
        stmt = select(func.count(KnowledgeDocument.id)).where(
            KnowledgeDocument.is_active == True,
            KnowledgeDocument.status == "ready",
        )
        if uploaded_by_id is not None:
            stmt = stmt.where(KnowledgeDocument.uploaded_by_id == uploaded_by_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def delete_system_docs(self) -> int:
        """Soft-delete all system-scope documents. Returns count."""
        stmt = (
            select(KnowledgeDocument)
            .where(KnowledgeDocument.scope == "system", KnowledgeDocument.is_active == True)
        )
        result = await self.session.execute(stmt)
        docs = result.scalars().all()
        for doc in docs:
            doc.is_active = False
        await self.session.flush()
        return len(docs)
