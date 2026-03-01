"""HOOPS AI - Files API"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from src.services.file_service import FileService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), coach=Depends(get_current_coach)):
    svc = FileService()
    result = await svc.save_upload(file)
    # Process tabular files
    if result["extension"] in [".csv"]:
        result["analysis"] = svc.process_csv(result["path"])
    elif result["extension"] in [".xlsx", ".xls"]:
        result["analysis"] = svc.process_excel(result["path"])
    # Process image files via GPT-4o Vision
    elif result["extension"] in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
        extracted = await svc.extract_image_stats(result["path"])
        result["analysis"] = {"extracted_text": extracted}
    return {"success": True, "data": result}
