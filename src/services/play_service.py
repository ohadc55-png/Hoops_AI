"""HOOPS AI - Play Service"""
import json
from sqlalchemy.ext.asyncio import AsyncSession
from src.repositories.play_repository import PlayRepository
from src.utils.openai_client import chat_completion_json
from src.utils.exceptions import ValidationError


class PlayService:
    def __init__(self, session: AsyncSession):
        self.repo = PlayRepository(session)

    async def get_plays(self, coach_id: int):
        return await self.repo.get_by_coach_id(coach_id)

    async def get_play(self, play_id: int):
        return await self.repo.get_by_id(play_id)

    async def create_play(self, coach_id: int, **kwargs):
        return await self.repo.create(coach_id=coach_id, **kwargs)

    async def update_play(self, play_id: int, **kwargs):
        return await self.repo.update(play_id, **kwargs)

    async def delete_play(self, play_id: int):
        return await self.repo.delete(play_id)

    async def share_play(self, play_id: int, team_id: int):
        return await self.repo.update(play_id, shared_with_team=True, team_id=team_id)

    async def unshare_play(self, play_id: int):
        return await self.repo.update(play_id, shared_with_team=False)

    async def get_shared_plays(self, team_ids: list[int]):
        return await self.repo.get_shared_by_team_ids(team_ids)

    async def ai_generate_play(self, coach_id: int, description: str):
        # Enrich with RAG knowledge
        rag_context = ""
        try:
            from src.services.rag.rag_service import RAGService
            rag_svc = RAGService()
            rag_result = await rag_svc.get_context_for_agent(
                message=f"basketball play {description}",
                agent_categories=["tactics", "offense", "defense"],
                n_results=3,
            )
            if rag_result:
                rag_context = f"\n\nReference knowledge:\n{rag_result}\n\nUse insights from the reference knowledge to design a better play."
        except Exception:
            pass

        prompt = f"""Generate a basketball play as JSON:
{{
  "name": "play name",
  "description": "brief description of the play",
  "offense_template": "horns",
  "defense_template": "man",
  "actions": [
    {{
      "type": "pass|dribble|cut|screen|handoff|shot",
      "pid": "o1",
      "to": {{"x": 50, "y": 50}},
      "t": 0,
      "duration": 1.5
    }}
  ],
  "ball_holder_id": "o1"
}}

Play request: {description}
Use offense player IDs o1-o5 and defense d1-d5.
Coordinates are 0-100 (percentage of court).
Time (t) is in seconds from start. Actions at the same t happen simultaneously.{rag_context}"""

        response = await chat_completion_json([{"role": "user", "content": prompt}])
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError):
            raise ValidationError("AI returned invalid play data. Please try again.")
        if not isinstance(data, dict):
            raise ValidationError("AI returned unexpected format. Please try again.")
        return await self.repo.create(
            coach_id=coach_id,
            name=data.get("name", "AI Play"),
            description=data.get("description", ""),
            offense_template=data.get("offense_template"),
            defense_template=data.get("defense_template"),
            actions=data.get("actions"),
            ball_holder_id=data.get("ball_holder_id"),
            is_ai_generated=True,
        )
