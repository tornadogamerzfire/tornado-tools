from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.ai_routes import router as ai_router
from routes.compress_routes import router as compress_router
from routes.convert_routes import router as convert_router
from routes.quiz_routes import router as quiz_router
from utils.cleanup import CleanupScheduler, cleanup_manager, purge_old_files
from utils.logger import logger

cleanup_scheduler = CleanupScheduler()


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*" or not raw:
        return ["*"]
    return [item.strip() for item in raw.split(",") if item.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        file_cleanup = purge_old_files()
        logger.info(
            "Startup cleanup sweep scanned=%s deleted=%s",
            file_cleanup["scanned"],
            file_cleanup["deleted"],
        )
    except Exception as exc:
        logger.warning("Startup file cleanup sweep failed: %s", exc)

    try:
        session_cleanup = cleanup_manager.purge_expired_sessions()
        logger.info("Startup session cleanup deleted=%s", session_cleanup.get("deleted", 0))
    except Exception as exc:
        logger.warning("Startup session cleanup sweep failed: %s", exc)

    cleanup_scheduler.start()
    cleanup_manager.start()
    yield
    cleanup_scheduler.stop()
    cleanup_manager.stop()


app = FastAPI(
    title="TornadoTools Combined Backend",
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
app.include_router(quiz_router)


@app.get("/health")
async def health():
    file_cleanup = purge_old_files()
    session_cleanup = cleanup_manager.purge_expired_sessions()
    return {
        "success": True,
        "service": "tornadotools-combined",
        "status": "ok",
        "docs": "/docs",
        "cleanup": {
            "files": file_cleanup,
            "sessions": session_cleanup,
        },
        "routes": {
            "converter_health": "/api/converter/health",
            "converter_warmup": "/api/converter/warmup",
            "compress_health": "/api/compress/health",
            "compress_warmup": "/api/compress/warmup",
            "quiz_health": "/api/quiz/health",
            "quiz_warmup": "/api/quiz/warmup",
        },
    }


@app.get("/api/health")
async def api_health():
    return await health()


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "TornadoTools combined backend is running.",
        "docs": "/docs",
        "services": {
            "converter": "/api/converter/health",
            "compress": "/api/compress/health",
            "quiz": "/api/quiz/health",
        },
    }
