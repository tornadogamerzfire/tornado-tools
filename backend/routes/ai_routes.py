from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/health")
async def health():
    return {"success": False, "message": "AI backend not implemented yet."}

@router.get("/capabilities")
async def capabilities():
    raise HTTPException(status_code=501, detail="AI backend is reserved for future phases.")
