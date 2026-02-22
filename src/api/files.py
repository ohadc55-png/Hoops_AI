"""HOOPS AI - Files API"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from src.services.file_service import FileService
from src.api.auth import get_current_coach

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), coach=Depends(get_current_coach)):
    svc = FileService()
    try:
        result = await svc.save_upload(file)
        # Process if tabular
        if result["extension"] in [".csv"]:
            result["analysis"] = svc.process_csv(result["path"])
        elif result["extension"] in [".xlsx", ".xls"]:
            result["analysis"] = svc.process_excel(result["path"])
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
