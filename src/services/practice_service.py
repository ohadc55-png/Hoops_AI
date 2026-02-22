"""HOOPS AI - Practice Service"""
import json
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.practice_repository import PracticeRepository
from src.models.practice_session import SessionSegment
from src.utils.openai_client import chat_completion_json


class PracticeService:
    def __init__(self, session: AsyncSession):
        self.db = session
        self.repo = PracticeRepository(session)

    async def get_sessions(self, coach_id: int):
        return await self.repo.get_all_with_segments(coach_id)

    async def get_session(self, session_id: int):
        return await self.repo.get_with_segments(session_id)

    async def create_session(self, coach_id: int, **kwargs):
        return await self.repo.create(coach_id=coach_id, **kwargs)

    async def update_session(self, session_id: int, **kwargs):
        return await self.repo.update(session_id, **kwargs)

    async def delete_session(self, session_id: int):
        return await self.repo.delete(session_id)

    async def add_segment(self, session_id: int, **kwargs):
        segment = SessionSegment(session_id=session_id, **kwargs)
        self.db.add(segment)
        await self.db.flush()
        await self.db.refresh(segment)
        return segment

    async def reorder_segments(self, session_id: int, segment_ids: list[int]):
        for index, seg_id in enumerate(segment_ids):
            segment = await self.db.get(SessionSegment, seg_id)
            if segment and segment.session_id == session_id:
                segment.order_index = index
        await self.db.flush()

    async def get_by_date_range(self, coach_id: int, start: date, end: date):
        return await self.repo.get_by_date_range(coach_id, start, end)

    async def ai_generate_session(self, coach_id: int, focus: str, duration: int = 90, session_date: date = None):
        # Enrich with RAG knowledge
        rag_context = ""
        try:
            from src.services.rag.rag_service import RAGService
            rag_svc = RAGService()
            rag_result = await rag_svc.get_context_for_agent(
                message=f"basketball practice plan {focus} {duration} minutes",
                agent_categories=["general", "drills", "game_management"],
                n_results=3,
            )
            if rag_result:
                rag_context = f"\n\nReference knowledge:\n{rag_result}\n\nUse insights from the reference knowledge to create a better practice plan."
        except Exception:
            pass

        prompt = f"""Generate a basketball practice session as JSON:
{{
  "title": "session title",
  "focus": "{focus}",
  "total_duration": {duration},
  "segments": [
    {{"segment_type": "warmup|drill|scrimmage|cooldown|break|film_study", "title": "name", "duration_minutes": N, "notes": "details", "order_index": 0}}
  ]
}}
Create a well-structured {duration}-minute practice focused on {focus}.{rag_context}"""

        response = await chat_completion_json([{"role": "user", "content": prompt}])
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            raise ValueError("AI returned invalid practice plan data. Please try again.")
        if not isinstance(data, dict):
            raise ValueError("AI returned unexpected format. Please try again.")

        session = await self.repo.create(
            coach_id=coach_id,
            date=session_date or date.today(),
            title=data.get("title", f"{focus} Practice"),
            focus=data.get("focus", focus),
            total_duration=data.get("total_duration", duration),
            is_ai_generated=True,
        )

        for seg_data in data.get("segments", []):
            segment = SessionSegment(
                session_id=session.id,
                segment_type=seg_data.get("segment_type", "drill"),
                title=seg_data.get("title", "Segment"),
                duration_minutes=seg_data.get("duration_minutes", 10),
                notes=seg_data.get("notes", ""),
                order_index=seg_data.get("order_index", 0),
            )
            self.db.add(segment)

        await self.db.flush()
        return await self.repo.get_with_segments(session.id)
