from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/compress", tags=["compress"])

@router.get("/health")
async def health():
    return {"success": False, "message": "Compress tool backend not implemented yet."}

@router.get("/capabilities")
async def capabilities():
    raise HTTPException(status_code=501, detail="Compress tool backend is reserved for future phases.")
