"""HOOPS AI - File Service"""
import os
import uuid
import asyncio
import base64
import pandas as pd
from pathlib import Path
from fastapi import UploadFile
from config import get_settings
from src.utils.exceptions import ValidationError

settings = get_settings()


class FileService:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, file: UploadFile) -> dict:
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise ValidationError(f"File type {ext} not allowed")

        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = self.upload_dir / filename
        content = await file.read()

        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise ValidationError("File too large (max 10MB)")

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

    async def extract_image_stats(self, filepath: str) -> str:
        """Use GPT-4o Vision to extract stats/data from an image."""
        from src.utils.openai_client import _get_client
        ext = Path(filepath).suffix.lower().lstrip(".")
        mime_map = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                    "gif": "image/gif", "webp": "image/webp"}
        mime = mime_map.get(ext, "image/png")
        with open(filepath, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()
        client = _get_client()
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{image_data}"},
                    },
                    {
                        "type": "text",
                        "text": (
                            "This is a basketball statistics image. "
                            "Extract ALL visible data: player names, numbers, "
                            "percentages, points, rebounds, assists, and any other stats. "
                            "Format the result as clear structured text (use tables or lists). "
                            "Do not summarize — include every data point visible."
                        ),
                    },
                ],
            }],
            max_tokens=2000,
        )
        return response.choices[0].message.content
