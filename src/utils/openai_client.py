"""
HOOPS AI - OpenAI Client Wrapper
"""
import asyncio
from openai import AsyncOpenAI
from config import get_settings

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=get_settings().OPENAI_API_KEY)
    return _client


async def _log_usage(usage_context: dict, usage, model: str):
    """Fire-and-forget AI usage logging."""
    try:
        from src.services.ai_usage_service import log_usage_fire_and_forget
        await log_usage_fire_and_forget(
            club_id=usage_context.get("club_id"),
            user_id=usage_context.get("user_id"),
            coach_id=usage_context.get("coach_id"),
            agent_name=usage_context.get("agent_name"),
            agent_type=usage_context.get("agent_type"),
            tokens_in=usage.prompt_tokens if usage else 0,
            tokens_out=usage.completion_tokens if usage else 0,
            model=model,
        )
    except Exception as e:
        print(f"[ai-usage] Logging error: {e}")


async def chat_completion(
    messages: list[dict],
    model: str | None = None,
    max_tokens: int | None = None,
    temperature: float | None = None,
    usage_context: dict | None = None,
) -> str:
    settings = get_settings()
    model_name = model or settings.OPENAI_MODEL
    response = await _get_client().chat.completions.create(
        model=model_name,
        messages=messages,
        max_tokens=max_tokens or settings.OPENAI_MAX_TOKENS,
        temperature=temperature if temperature is not None else settings.OPENAI_TEMPERATURE,
    )
    if usage_context and response.usage:
        asyncio.create_task(_log_usage(usage_context, response.usage, model_name))
    return response.choices[0].message.content


async def chat_completion_json(
    messages: list[dict],
    model: str | None = None,
    usage_context: dict | None = None,
) -> str:
    settings = get_settings()
    client = _get_client()
    model_name = model or settings.OPENAI_MODEL

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE,
            response_format={"type": "json_object"},
        )
    except Exception:
        # Model doesn't support response_format — fall back to prompting
        fallback_msgs = [{"role": "system", "content": "Respond ONLY with valid JSON. No markdown, no explanation."}] + messages
        response = await client.chat.completions.create(
            model=model_name,
            messages=fallback_msgs,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            temperature=settings.OPENAI_TEMPERATURE,
        )
    if usage_context and response.usage:
        asyncio.create_task(_log_usage(usage_context, response.usage, model_name))
    return response.choices[0].message.content


async def create_embedding(text: str, model: str | None = None) -> list[float]:
    """Generate embedding vector for a single text."""
    settings = get_settings()
    response = await _get_client().embeddings.create(
        model=model or settings.EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


async def create_embeddings_batch(texts: list[str], model: str | None = None) -> list[list[float]]:
    """Generate embedding vectors for multiple texts in one API call."""
    settings = get_settings()
    response = await _get_client().embeddings.create(
        model=model or settings.EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]
