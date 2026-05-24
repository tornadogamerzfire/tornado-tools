from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import FileResponse

from controllers.convert_controller import capabilities, cleanup_session, convert, download, health, warmup

router = APIRouter(prefix="/api/converter", tags=["converter"])

router.get("/capabilities")(capabilities)
router.get("/health")(health)
router.get("/warmup")(warmup)
router.post("/convert")(convert)
router.post("/session/{session_id}/cleanup")(cleanup_session)
router.delete("/session/{session_id}/cleanup")(cleanup_session)
router.get("/download/{filename}")(download)
