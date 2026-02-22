"""HOOPS AI - Vector Store: ChromaDB wrapper for knowledge embeddings."""
import asyncio
import chromadb
from config import get_settings

_chroma_client = None
_collection = None

COLLECTION_NAME = "basketball_knowledge"


def _get_chroma():
    """Lazy-init ChromaDB persistent client (singleton)."""
    global _chroma_client, _collection
    if _chroma_client is None:
        settings = get_settings()
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DIR)
        _collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


async def add_chunks(
    document_id: int,
    chunks: list[dict],
    embeddings: list[list[float]],
    metadata: dict,
) -> int:
    """
    Add document chunks to ChromaDB.
    chunks: list of {text, source_page, chunk_index}
    embeddings: parallel list of embedding vectors
    metadata: {scope, uploaded_by_id, category, language, title}
    Returns number of chunks added.
    """
    collection = _get_chroma()

    ids = []
    documents = []
    metadatas = []

    for chunk, embedding in zip(chunks, embeddings):
        chunk_id = f"doc_{document_id}_chunk_{chunk['chunk_index']}"
        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append({
            "document_id": document_id,
            "scope": metadata.get("scope", "coach"),
            "uploaded_by_id": metadata.get("uploaded_by_id", 0),
            "category": metadata["category"],
            "language": metadata.get("language", "en"),
            "title": metadata["title"],
            "chunk_index": chunk["chunk_index"],
            "source_page": chunk.get("source_page", 0),
        })

    await asyncio.to_thread(
        collection.add,
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )
    return len(ids)


async def query_similar(
    query_embedding: list[float],
    n_results: int = 5,
    category_filter: list[str] | None = None,
    language_filter: str | None = None,
) -> list[dict]:
    """
    Query ChromaDB for similar chunks.
    Returns list of {text, metadata, distance}.
    """
    collection = _get_chroma()

    where_filter = None
    conditions = []
    if category_filter:
        if len(category_filter) == 1:
            conditions.append({"category": category_filter[0]})
        else:
            conditions.append({"category": {"$in": category_filter}})
    if language_filter:
        conditions.append({"language": language_filter})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
    }
    if where_filter:
        kwargs["where"] = where_filter

    result = await asyncio.to_thread(collection.query, **kwargs)

    items = []
    if result and result["documents"] and result["documents"][0]:
        for i, doc in enumerate(result["documents"][0]):
            items.append({
                "text": doc,
                "metadata": result["metadatas"][0][i] if result["metadatas"] else {},
                "distance": result["distances"][0][i] if result["distances"] else 0,
            })
    return items


async def delete_document_chunks(document_id: int):
    """Remove all chunks for a document from ChromaDB."""
    collection = _get_chroma()

    result = await asyncio.to_thread(
        collection.get,
        where={"document_id": document_id},
    )

    if result and result["ids"]:
        await asyncio.to_thread(collection.delete, ids=result["ids"])


async def delete_all_system_chunks():
    """Remove all system-scope chunks from ChromaDB."""
    collection = _get_chroma()

    result = await asyncio.to_thread(
        collection.get,
        where={"scope": "system"},
    )

    if result and result["ids"]:
        await asyncio.to_thread(collection.delete, ids=result["ids"])


async def get_collection_stats() -> dict:
    """Get basic stats about the vector store."""
    collection = _get_chroma()
    count = await asyncio.to_thread(collection.count)
    return {"total_chunks": count, "collection": COLLECTION_NAME}
