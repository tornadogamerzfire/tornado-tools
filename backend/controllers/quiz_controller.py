from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from models.quiz_models import QuizBuildRequest, QuizSubmitRequest
from services.quiz_service import QuizService
from services.session_store import QuizSessionStore
from utils.cleanup import cleanup_manager


session_store = QuizSessionStore()
quiz_service = QuizService(session_store=session_store)
cleanup_manager.register_session_store(session_store)

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


def _json(data: dict[str, Any], code: int = 200) -> JSONResponse:
    return JSONResponse(content=data, status_code=code)


@router.get("/health")
async def health():
    cleanup_manager.purge_expired_sessions()
    return _json({
        "success": True,
        "message": "AI Quiz backend is healthy.",
        "data": {
            "ready": True,
            "timestamp": int(time.time()),
        },
    })


@router.get("/warmup")
async def warmup():
    cleanup_manager.purge_expired_sessions()
    return _json({
        "success": True,
        "message": "Quiz engine warmed.",
        "data": {
            "ready": True,
            "timestamp": int(time.time()),
        },
    })


@router.get("/capabilities")
async def capabilities():
    return _json({
        "success": True,
        "data": quiz_service.capabilities(),
    })


@router.post("/generate")
async def generate_quiz(payload: QuizBuildRequest):
    try:
        result = await quiz_service.build_quiz(payload)
        return _json({
            "success": True,
            "data": result,
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {exc}")


@router.post("/submit")
async def submit_quiz(payload: QuizSubmitRequest):
    try:
        result = quiz_service.submit(
            session_token=payload.session_token,
            answers=payload.answers,
            elapsed_seconds=payload.elapsed_seconds,
        )
        return _json({
            "success": True,
            "data": result,
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Quiz submission failed: {exc}")


@router.post("/session/{session_token}/cleanup")
async def cleanup_session(session_token: str, request: Request):
    delay_seconds = 0
    try:
        body = await request.json()
        delay_seconds = int(body.get("delaySeconds") or 0)
    except Exception:
        delay_seconds = 0

    if delay_seconds and delay_seconds > 0:
        cleanup_manager.schedule_session_cleanup(session_token, delay_seconds)
        return _json({
            "success": True,
            "message": "Cleanup scheduled.",
            "data": {
                "sessionToken": session_token,
                "delaySeconds": delay_seconds,
            },
        })

    cleanup_manager.delete_session(session_token)
    return _json({
        "success": True,
        "message": "Session cleaned.",
        "data": {
            "sessionToken": session_token,
        },
    })
