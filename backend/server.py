from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.convert_routes import router as convert_router
from routes.compress_routes import router as compress_router
from routes.ai_routes import router as ai_router
from utils.cleanup import CleanupScheduler, purge_old_files
from utils.logger import logger

cleanup_scheduler = CleanupScheduler()


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*" or not raw:
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sweep: works after Render cold starts / sleep wakeups.
    try:
        result = purge_old_files()
        logger.info("Startup cleanup sweep scanned=%s deleted=%s", result["scanned"], result["deleted"])
    except Exception as exc:
        logger.warning("Startup cleanup sweep failed: %s", exc)

    cleanup_scheduler.start()
    yield
    cleanup_scheduler.stop()


app = FastAPI(
    title="TornadoTools File Converter Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router)
app.include_router(compress_router)
app.include_router(ai_router)




@app.get("/health")
async def health():
    return {
        "success": True,
        "service": "tornado-compress",
        "status": "ok",
        "docs": "/docs",
        "routes": {
            "compress": "/api/compress/health",
            "warmup": "/api/compress/warmup",
            "capabilities": "/api/compress/capabilities"
        }
    }

@app.get("/api/health")
async def api_health():
    return {
        "success": True,
        "service": "tornado-compress",
        "status": "ok",
    }


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "TornadoTools File Converter backend is running.",
        "docs": "/docs",
        "health": "/api/converter/health",
        "warmup": "/api/converter/warmup",
    }
