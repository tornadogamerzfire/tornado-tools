from __future__ import annotations

from fastapi import HTTPException, status

def require_target(target: str):
    target = (target or "").strip().lower()
    if not target:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target format is required")
    return target
