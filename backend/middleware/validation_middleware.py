from __future__ import annotations

from fastapi import HTTPException, status
from pathlib import Path

SUPPORTED_ARCHIVE_EXTS = {"zip"}

def require_file(file):
    if file is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded")
    return file

def require_target(target: str):
    target = (target or "").strip().lower()
    if not target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target format is required")
    return target

def assert_supported_source(source_ext: str, supported_sources: set[str]):
    source_ext = (source_ext or "").lower().strip()
    if not source_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not determine source file type")
    if source_ext not in supported_sources:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail=f"Source format '{source_ext}' is not supported yet")
    return source_ext
