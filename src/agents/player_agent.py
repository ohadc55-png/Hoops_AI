"""HOOPS AI - Player Agent & Router"""
from src.utils.openai_client import chat_completion
from src.agents.player_prompts import PLAYER_PROMPTS
from src.constants.player_agents import PLAYER_AGENTS


class PlayerAgent:
    """Agent class for player-facing AI chat."""

    def __init__(self, agent_key: str, player_context: dict):
        self.key = agent_key
        self.meta = PLAYER_AGENTS[agent_key]
        self.player_context = player_context

    @property
    def system_prompt(self) -> str:
        base = PLAYER_PROMPTS[self.key].format(
            player_name=self.player_context.get("player_name", "Player"),
            position=self.player_context.get("position", ""),
            team_name=self.player_context.get("team_name", ""),
        )
        summary = self.player_context.get("player_summary", "")
        if summary:
            base += f"\n\n{summary}"
        data = self.player_context.get("data_context")
        if data:
            base += (
                f"\n\n{data}\n\nUse the data above to personalize your advice. "
                "Reference specific strengths, weaknesses, and upcoming events when relevant. "
                "If the data doesn't contain what's needed, give general advice."
            )
        rag = self.player_context.get("rag_context")
        if rag:
            base += (
                f"\n\n{rag}\n\nThe knowledge above comes from coaching resources. "
                "Use it to give better, more detailed advice. Mention the source when helpful."
            )
        return base

    async def chat(self, messages: list[dict], usage_context: dict | None = None) -> str:
        full_messages = [{"role": "system", "content": self.system_prompt}] + messages
        return await chat_completion(full_messages, usage_context=usage_context)


def route_to_player_agent(message: str) -> str:
    """Route a player message to the best matching player agent."""
    message_lower = message.lower()
    scores = {}
    for key, meta in PLAYER_AGENTS.items():
        score = sum(1 for kw in meta["keywords"] if kw in message_lower)
        scores[key] = score

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "shooting_coach"  # Default fallback for players
    return best
