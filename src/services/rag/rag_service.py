"""HOOPS AI - RAG Service: High-level retrieval-augmented generation."""
import asyncio
from config import get_settings
from src.services.rag.embedding_service import embed_text, embed_texts
from src.services.rag.vector_store import (
    query_similar, add_chunks, delete_document_chunks, delete_all_system_chunks,
)
from src.services.rag.document_processor import extract_text, chunk_text


class RAGService:
    """Orchestrates document processing and retrieval."""

    async def process_document(
        self,
        document_id: int,
        file_path: str,
        metadata: dict,
    ) -> int:
        """
        Full pipeline: extract text -> chunk -> embed -> store.
        Returns number of chunks created.
        """
        # Step 1: Extract text
        pages = await asyncio.to_thread(extract_text, file_path)
        if not pages:
            raise ValueError("No text could be extracted from the document")

        # Step 2: Chunk
        chunks = chunk_text(pages)
        if not chunks:
            raise ValueError("Document produced no chunks after processing")

        # Step 3: Embed all chunks
        texts = [c["text"] for c in chunks]
        embeddings = await embed_texts(texts)

        # Step 4: Store in ChromaDB
        count = await add_chunks(document_id, chunks, embeddings, metadata)
        return count

    async def search(
        self,
        query: str,
        categories: list[str] | None = None,
        n_results: int = 5,
        language: str | None = None,
    ) -> list[dict]:
        """
        Semantic search: embed query -> find similar chunks.
        Returns list of {text, metadata, distance}.
        """
        query_embedding = await embed_text(query)
        results = await query_similar(
            query_embedding=query_embedding,
            n_results=n_results,
            category_filter=categories,
            language_filter=language,
        )
        return results

    async def get_context_for_agent(
        self,
        message: str,
        agent_categories: list[str],
        n_results: int = 4,
        language: str | None = None,
    ) -> str | None:
        """
        Retrieve RAG context formatted for injection into agent system prompt.
        Returns formatted string or None if no relevant results.
        """
        if not agent_categories:
            return None

        results = await self.search(
            query=message,
            categories=agent_categories,
            n_results=n_results,
            language=language,
        )

        if not results:
            return None

        # Filter by relevance threshold (cosine distance < 0.8)
        relevant = [r for r in results if r["distance"] < 0.8]
        if not relevant:
            return None

        settings = get_settings()
        max_chars = settings.RAG_MAX_CONTEXT_CHARS

        # Build formatted context within budget
        lines = ["=== COACHING KNOWLEDGE BASE ==="]
        total_chars = len(lines[0])

        for r in relevant:
            source = r["metadata"].get("title", "Unknown")
            page = r["metadata"].get("source_page", 0)
            page_ref = f" (p.{page})" if page > 0 else ""

            entry = f"\n[Source: {source}{page_ref}]\n{r['text']}"

            if total_chars + len(entry) > max_chars:
                break

            lines.append(entry)
            total_chars += len(entry)

        if len(lines) <= 1:
            return None

        return "\n".join(lines)

    async def delete_document(self, document_id: int):
        """Remove all chunks for a document from the vector store."""
        await delete_document_chunks(document_id)

    async def delete_all_system(self):
        """Remove all system-scope chunks from the vector store."""
        await delete_all_system_chunks()
