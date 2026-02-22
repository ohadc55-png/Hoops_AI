FROM python:3.13-slim

# System dependencies for chromadb (hnswlib) and document processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create persistent data directories (Railway volume overlays /data at runtime)
RUN mkdir -p /data/database/chroma /data/uploads/knowledge /data/uploads/videos

EXPOSE 8000

# Single worker — mandatory for SQLite (single writer)
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
