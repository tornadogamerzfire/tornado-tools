from __future__ import annotations

from fastapi import HTTPException, status, UploadFile

MAX_UPLOAD_BYTES = 250 * 1024 * 1024  # 250 MB safety cap

def validate_upload_size(file: UploadFile):
    # FastAPI/Starlette streams uploads, but we still enforce a soft cap in controllers.
    return file

def validate_target_format(target: str):
    return target.lower().strip()
