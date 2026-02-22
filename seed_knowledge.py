"""
HOOPS AI - Knowledge Base Seed Script
Seeds system-tier basketball knowledge from knowledge/base/ directory.

Usage:
    python seed_knowledge.py              # Process new/changed files only
    python seed_knowledge.py --reset      # Clear all system docs and re-process
"""
import asyncio
import sys
import os
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import get_settings, BASE_DIR
from src.utils.database import init_db, AsyncSessionLocal
from src.repositories.knowledge_repository import KnowledgeRepository
from src.services.rag.rag_service import RAGService
from src.constants.rag_categories import FILENAME_CATEGORY_MAP

KNOWLEDGE_DIR = BASE_DIR / "knowledge" / "base"
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def detect_category(filename: str) -> str:
    """Auto-detect category from filename prefix."""
    name_lower = Path(filename).stem.lower()
    for prefix, category in FILENAME_CATEGORY_MAP.items():
        if name_lower.startswith(prefix):
            return category
    return "general"


async def seed(reset: bool = False):
    """Main seed function."""
    print("=" * 60)
    print("HOOPS AI - Knowledge Base Seeder")
    print("=" * 60)

    # Initialize database
    await init_db()

    async with AsyncSessionLocal() as session:
        repo = KnowledgeRepository(session)
        rag_svc = RAGService()

        # Reset if requested
        if reset:
            print("\n[RESET] Clearing all system knowledge documents...")
            count = await repo.delete_system_docs()
            await rag_svc.delete_all_system()
            await session.commit()
            print(f"  Deleted {count} system documents from DB + ChromaDB")

        # Scan knowledge/base/ directory
        if not KNOWLEDGE_DIR.exists():
            print(f"\n[ERROR] Knowledge directory not found: {KNOWLEDGE_DIR}")
            print("  Create it and add PDF/DOCX/TXT files.")
            return

        files = [
            f for f in KNOWLEDGE_DIR.iterdir()
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
        ]

        if not files:
            print(f"\n[INFO] No supported files found in {KNOWLEDGE_DIR}")
            print(f"  Supported: {', '.join(SUPPORTED_EXTENSIONS)}")
            return

        print(f"\nFound {len(files)} files in {KNOWLEDGE_DIR}")

        processed = 0
        skipped = 0
        errors = 0

        for file_path in sorted(files):
            filename = file_path.name
            category = detect_category(filename)

            # Check if already processed
            existing = await repo.get_by_original_name_and_scope(filename, "system")
            if existing and existing.status == "ready" and not reset:
                print(f"  [SKIP] {filename} (already processed, {existing.chunk_count} chunks)")
                skipped += 1
                continue

            print(f"\n  [PROCESSING] {filename}")
            print(f"    Category: {category}")
            print(f"    Size: {file_path.stat().st_size / 1024:.1f} KB")

            try:
                # Create DB record
                doc = await repo.create(
                    scope="system",
                    uploaded_by_id=None,
                    uploaded_by_role="system",
                    filename=filename,
                    original_name=filename,
                    file_path=str(file_path),
                    file_type=file_path.suffix.lstrip("."),
                    file_size=file_path.stat().st_size,
                    title=file_path.stem.replace("_", " ").replace("-", " ").title(),
                    category=category,
                    language="en",
                    status="processing",
                )
                await session.commit()

                # Process: extract → chunk → embed → store
                chunk_count = await rag_svc.process_document(
                    document_id=doc.id,
                    file_path=str(file_path),
                    metadata={
                        "scope": "system",
                        "uploaded_by_id": 0,
                        "category": category,
                        "language": "en",
                        "title": doc.title,
                    },
                )

                doc.status = "ready"
                doc.chunk_count = chunk_count
                await session.commit()

                print(f"    ✓ Created {chunk_count} chunks")
                processed += 1

            except Exception as e:
                print(f"    ✗ Error: {e}")
                if doc:
                    doc.status = "error"
                    doc.error_message = str(e)[:500]
                    await session.commit()
                errors += 1

    print(f"\n{'=' * 60}")
    print(f"Done! Processed: {processed}, Skipped: {skipped}, Errors: {errors}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    reset = "--reset" in sys.argv
    asyncio.run(seed(reset=reset))
