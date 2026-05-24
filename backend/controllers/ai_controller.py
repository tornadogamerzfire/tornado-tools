from fastapi import HTTPException

async def not_ready(*args, **kwargs):
    raise HTTPException(status_code=501, detail="AI tool backend is reserved for future phases.")
