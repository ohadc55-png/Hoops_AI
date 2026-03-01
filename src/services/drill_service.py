"""HOOPS AI - Drill Service"""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.drill_repository import DrillRepository
from src.utils.openai_client import chat_completion_json
from src.utils.exceptions import ValidationError


class DrillService:
    def __init__(self, session: AsyncSession):
        self.repo = DrillRepository(session)

    async def get_drills(self, coach_id: int, category=None, difficulty=None, search=None):
        return await self.repo.filter_drills(coach_id, category, difficulty, search)

    async def get_drill(self, drill_id: int):
        return await self.repo.get_by_id(drill_id)

    async def create_drill(self, coach_id: int, **kwargs):
        self._serialize_json_fields(kwargs)
        return await self.repo.create(coach_id=coach_id, **kwargs)

    async def update_drill(self, drill_id: int, **kwargs):
        return await self.repo.update(drill_id, **kwargs)

    async def delete_drill(self, drill_id: int):
        return await self.repo.delete(drill_id)

    @staticmethod
    def _serialize_json_fields(data: dict):
        """Serialize list/dict fields to JSON strings for SQLite compatibility."""
        for key in ("coaching_points", "tags"):
            if key in data and isinstance(data[key], (list, dict)):
                data[key] = json.dumps(data[key])

    @staticmethod
    def _extract_json(text: str) -> dict:
        """Extract JSON from response, handling markdown code fences."""
        if not text:
            raise ValidationError("Empty response from AI")
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            raise ValidationError("AI returned invalid drill data. Please try again.")

    async def ai_generate_drill(self, coach_id: int, category: str, difficulty: str, focus: str = ""):
        focus_text = focus.strip() if focus else category

        # Enrich with RAG knowledge
        rag_context = ""
        try:
            from src.services.rag.rag_service import RAGService
            rag_svc = RAGService()
            rag_result = await rag_svc.get_context_for_agent(
                message=f"basketball drill {category} {difficulty} {focus_text}",
                agent_categories=["drills", "player_development", "shooting", "ball_handling", "passing"],
                n_results=3,
            )
            if rag_result:
                rag_context = f"\n\nReference knowledge:\n{rag_result}\n\nUse insights from the reference knowledge above to create a better, more detailed drill."
        except Exception:
            pass

        prompt = f"""Generate a basketball drill as JSON with these fields:
{{
  "title": "drill name",
  "description": "brief description",
  "category": "{category}",
  "difficulty": "{difficulty}",
  "duration_minutes": 10-20,
  "instructions": "step by step instructions",
  "coaching_points": ["point 1", "point 2", "point 3"],
  "tags": ["tag1", "tag2"]
}}
Focus: {focus_text}. Make it practical and age-appropriate.{rag_context}"""

        response = await chat_completion_json([{"role": "user", "content": prompt}])
        data = self._extract_json(response)
        filtered = {k: v for k, v in data.items() if k in [
            "title", "description", "category", "difficulty",
            "duration_minutes", "instructions", "coaching_points", "tags"
        ]}
        # Explicitly serialize list fields to JSON strings for SQLite
        for key in ("coaching_points", "tags"):
            if key in filtered and isinstance(filtered[key], list):
                filtered[key] = json.dumps(filtered[key])
        return await self.repo.create(
            coach_id=coach_id,
            is_ai_generated=True,
            **filtered,
        )
