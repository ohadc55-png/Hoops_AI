"""HOOPS AI - Base Agent & Router"""
from src.utils.openai_client import chat_completion
from src.agents.prompts import PROMPTS
from src.constants.agents import AGENTS


class BaseAgent:
    """Base class for all AI agents."""

    def __init__(self, agent_key: str, coach_context: dict):
        self.key = agent_key
        self.meta = AGENTS[agent_key]
        self.coach_context = coach_context

    @property
    def system_prompt(self) -> str:
        base = PROMPTS[self.key].format(
            coach_name=self.coach_context.get("name", "Coach"),
            team_name=self.coach_context.get("team_name", ""),
            age_group=self.coach_context.get("age_group", ""),
            level=self.coach_context.get("level", ""),
        )
        summary = self.coach_context.get("team_summary", "")
        if summary:
            base += f"\n\n{summary}"
        data = self.coach_context.get("data_context")
        if data:
            base += f"\n\n{data}\n\nUse the data above to answer accurately. Reference specific names, dates, and numbers. If the data doesn't contain what's needed, say so honestly."
        rag = self.coach_context.get("rag_context")
        if rag:
            base += f"\n\n{rag}\n\nThe knowledge above comes from basketball coaching literature uploaded by your club. Reference it to support your advice, citing the source when possible. Combine this knowledge with the team's actual data when both are available."
        return base

    async def chat(self, messages: list[dict], usage_context: dict | None = None) -> str:
        full_messages = [{"role": "system", "content": self.system_prompt}] + messages
        return await chat_completion(full_messages, usage_context=usage_context)


def route_to_agent(message: str) -> str:
    """Route a user message to the best matching agent based on keywords."""
    message_lower = message.lower()
    scores = {}
    for key, meta in AGENTS.items():
        score = sum(1 for kw in meta["keywords"] if kw in message_lower)
        scores[key] = score

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "assistant_coach"  # Default fallback
    return best
