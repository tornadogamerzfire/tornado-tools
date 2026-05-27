from fastapi import APIRouter

from controllers.compress_controller import (
    capabilities,
    cleanup_session,
    compress,
    download,
    health,
    warmup,
)

router = APIRouter(prefix="/api/compress", tags=["compress"])

router.add_api_route("/health", health, methods=["GET"])
router.add_api_route("/warmup", warmup, methods=["GET"])
router.add_api_route("/capabilities", capabilities, methods=["GET"])
router.add_api_route("/compress", compress, methods=["POST"])
router.add_api_route("/download/{filename}", download, methods=["GET"])
router.add_api_route("/session/{session_id}/cleanup", cleanup_session, methods=["POST"])
