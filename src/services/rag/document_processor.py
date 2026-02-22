"""HOOPS AI - Document Processor: Parse files and chunk text for RAG."""
import re
from pathlib import Path
import tiktoken

from config import get_settings

_enc = tiktoken.encoding_for_model("gpt-4")


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returns list of {page: int, text: str}."""
    from pypdf import PdfReader
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page": i + 1, "text": text.strip()})
    return pages


def extract_text_from_docx(file_path: str) -> list[dict]:
    """Extract text from DOCX, returns list of {page: 0, text: str}."""
    from docx import Document
    doc = Document(file_path)
    full_text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [{"page": 0, "text": full_text}] if full_text else []


def extract_text_from_txt(file_path: str) -> list[dict]:
    """Extract text from TXT file."""
    text = Path(file_path).read_text(encoding="utf-8", errors="ignore")
    return [{"page": 0, "text": text.strip()}] if text.strip() else []


EXTRACTORS = {
    ".pdf": extract_text_from_pdf,
    ".docx": extract_text_from_docx,
    ".txt": extract_text_from_txt,
}


def extract_text(file_path: str) -> list[dict]:
    """Extract text from any supported file type."""
    ext = Path(file_path).suffix.lower()
    extractor = EXTRACTORS.get(ext)
    if not extractor:
        raise ValueError(f"Unsupported file type: {ext}")
    return extractor(file_path)


def chunk_text(
    pages: list[dict],
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[dict]:
    """
    Split extracted pages into overlapping chunks.
    Returns list of {text: str, source_page: int, chunk_index: int}.
    """
    settings = get_settings()
    chunk_size = chunk_size or settings.RAG_CHUNK_SIZE
    overlap = overlap or settings.RAG_CHUNK_OVERLAP
    max_chunk_size = int(chunk_size * 1.6)

    chunks = []
    chunk_index = 0

    for page_data in pages:
        text = page_data["text"]
        page = page_data["page"]

        paragraphs = re.split(r'\n\s*\n', text)

        current_chunk = ""
        current_tokens = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_tokens = count_tokens(para)

            # If single paragraph exceeds max, split by sentences
            if para_tokens > max_chunk_size:
                if current_chunk:
                    chunks.append({
                        "text": current_chunk.strip(),
                        "source_page": page,
                        "chunk_index": chunk_index,
                    })
                    chunk_index += 1
                    current_chunk = ""
                    current_tokens = 0

                sentences = re.split(r'(?<=[.!?])\s+', para)
                for sent in sentences:
                    sent_tokens = count_tokens(sent)
                    if current_tokens + sent_tokens > chunk_size and current_chunk:
                        chunks.append({
                            "text": current_chunk.strip(),
                            "source_page": page,
                            "chunk_index": chunk_index,
                        })
                        chunk_index += 1
                        overlap_text = _get_overlap(current_chunk, overlap)
                        current_chunk = overlap_text + " " + sent
                        current_tokens = count_tokens(current_chunk)
                    else:
                        current_chunk += " " + sent if current_chunk else sent
                        current_tokens += sent_tokens
                continue

            # Normal case: paragraph fits
            if current_tokens + para_tokens > chunk_size and current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "source_page": page,
                    "chunk_index": chunk_index,
                })
                chunk_index += 1
                overlap_text = _get_overlap(current_chunk, overlap)
                current_chunk = overlap_text + "\n\n" + para
                current_tokens = count_tokens(current_chunk)
            else:
                current_chunk += "\n\n" + para if current_chunk else para
                current_tokens += para_tokens

        # Flush remaining text
        if current_chunk.strip():
            chunks.append({
                "text": current_chunk.strip(),
                "source_page": page,
                "chunk_index": chunk_index,
            })
            chunk_index += 1

    return chunks


def _get_overlap(text: str, overlap_tokens: int) -> str:
    """Get the last N tokens of text as overlap."""
    tokens = _enc.encode(text)
    if len(tokens) <= overlap_tokens:
        return text
    return _enc.decode(tokens[-overlap_tokens:])
