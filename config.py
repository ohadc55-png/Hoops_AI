"""
HOOPS AI - Configuration
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

BASE_DIR = Path(__file__).resolve().parent

# Persistent data directory: RAILWAY_VOLUME_DIR for production, BASE_DIR for local dev
_volume_dir = os.environ.get("RAILWAY_VOLUME_DIR")
DATA_DIR = Path(_volume_dir) if _volume_dir else BASE_DIR


class Settings(BaseSettings):
    APP_NAME: str = "HOOPS AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:8000,http://127.0.0.1:8000"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = f"sqlite+aiosqlite:///{DATA_DIR / 'database' / 'hoops_ai.db'}"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.7

    UPLOAD_DIR: str = str(DATA_DIR / "uploads")
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024
    ALLOWED_EXTENSIONS: list[str] = [".csv", ".xlsx", ".xls", ".json", ".png", ".jpg", ".jpeg", ".gif", ".webp"]

    # Video Upload Settings (Drill Video Proof)
    VIDEO_UPLOAD_DIR: str = str(DATA_DIR / "uploads" / "videos")
    VIDEO_MAX_UPLOAD_SIZE: int = 15 * 1024 * 1024  # 15MB
    VIDEO_ALLOWED_EXTENSIONS: list[str] = [".mp4", ".mov", ".webm"]

    # Cloudinary Settings (Video Hosting)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_UPLOAD_PRESET: str = "hoops_scouting"

    # Scouting / Video Room Settings
    SCOUTING_MAX_UPLOAD_SIZE: int = 500 * 1024 * 1024  # 500MB
    SCOUTING_ALLOWED_EXTENSIONS: list[str] = [".mp4", ".mov", ".webm"]
    SCOUTING_DEFAULT_QUOTA_BYTES: int = 50 * 1024 * 1024 * 1024  # 50GB
    SCOUTING_VIDEO_TTL_DAYS: int = 14

    # SMTP Email Settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@hoopsai.com"
    SMTP_FROM_NAME: str = "HOOPS AI"
    SMTP_USE_TLS: bool = True

    # RAG Settings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50
    RAG_MAX_CONTEXT_CHARS: int = 3000
    KNOWLEDGE_UPLOAD_DIR: str = str(DATA_DIR / "uploads" / "knowledge")
    KNOWLEDGE_MAX_UPLOAD_SIZE: int = 20 * 1024 * 1024
    CHROMA_DIR: str = str(DATA_DIR / "database" / "chroma")

    model_config = {"env_file": str(BASE_DIR / ".env"), "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
