"""HOOPS AI - File Service"""
import os
import uuid
import asyncio
import pandas as pd
from pathlib import Path
from fastapi import UploadFile
from config import get_settings

settings = get_settings()


class FileService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> dict:
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ValueError(f"File type {ext} not allowed")

        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = self.upload_dir / filename
        content = await file.read()

        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise ValueError("File too large (max 10MB)")

        await asyncio.to_thread(filepath.write_bytes, content)

        return {
            "filename": filename,
            "original_name": file.filename,
            "path": str(filepath),
            "size": len(content),
            "extension": ext,
        }

    def process_csv(self, filepath: str) -> dict:
        df = pd.read_csv(filepath)
        return {
            "columns": list(df.columns),
            "rows": len(df),
            "preview": df.head(10).to_dict(orient="records"),
            "summary": df.describe().to_dict(),
        }

    def process_excel(self, filepath: str) -> dict:
        df = pd.read_excel(filepath)
        return {
            "columns": list(df.columns),
            "rows": len(df),
            "preview": df.head(10).to_dict(orient="records"),
            "summary": df.describe().to_dict(),
        }
