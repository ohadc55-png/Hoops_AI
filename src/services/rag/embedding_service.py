"""HOOPS AI - Embedding Service: Generate embeddings via OpenAI."""
from src.utils.openai_client import create_embedding, create_embeddings_batch


async def embed_text(text: str) -> list[float]:
    """Generate embedding for a single text string."""
    return await create_embedding(text)


async def embed_texts(texts: list[str], batch_size: int = 20) -> list[list[float]]:
    """Generate embeddings for multiple texts, batched for API efficiency."""
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embeddings = await create_embeddings_batch(batch)
        all_embeddings.extend(embeddings)
    return all_embeddings
