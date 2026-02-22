"""HOOPS AI - Cloudinary Service (Video Hosting)"""
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from config import get_settings

settings = get_settings()

# Configure Cloudinary (lazy — only if credentials exist)
_configured = False


def _ensure_configured():
    global _configured
    if not _configured and settings.CLOUDINARY_CLOUD_NAME:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )
        _configured = True


class CloudinaryService:
    """Thin wrapper around Cloudinary Python SDK.
    Used for server-side operations: delete, URL generation.
    Upload is done directly from the browser (unsigned preset).
    """

    def get_upload_config(self) -> dict:
        """Return config needed for browser-side direct upload."""
        return {
            "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
            "upload_preset": settings.CLOUDINARY_UPLOAD_PRESET,
        }

    def delete_video(self, public_id: str) -> bool:
        """Delete a video from Cloudinary."""
        _ensure_configured()
        if not settings.CLOUDINARY_CLOUD_NAME:
            return False
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type="video")
            return result.get("result") == "ok"
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Cloudinary delete error: {e}")
            return False

    def get_thumbnail_url(self, public_id: str, width: int = 400, height: int = 225) -> str:
        """Generate thumbnail URL via Cloudinary transformation."""
        if not settings.CLOUDINARY_CLOUD_NAME:
            return ""
        return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/video/upload/w_{width},h_{height},c_fill,so_5/{public_id}.jpg"

    def get_hls_url(self, public_id: str) -> str:
        """Generate adaptive streaming (HLS) URL."""
        if not settings.CLOUDINARY_CLOUD_NAME:
            return ""
        return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/video/upload/sp_hd/{public_id}.m3u8"

    def get_video_url(self, public_id: str) -> str:
        """Generate direct mp4 playback URL."""
        if not settings.CLOUDINARY_CLOUD_NAME:
            return ""
        return f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/video/upload/{public_id}.mp4"
