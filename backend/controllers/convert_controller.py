from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

from fastapi import File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
from starlette.background import BackgroundTask

from middleware.rate_limit_middleware import limiter
from middleware.validation_middleware import require_target
from services.convert.engine import (
    build_capabilities,
    capabilities_for_source,
    convert_file,
    detect_output_mime,
    normalise_ext,
    source_category,
)
from utils.cleanup import delete_session_artifacts, purge_old_files
from utils.logger import logger
from utils.temp_files import ensure_session_dirs, ext_of, sanitize_filename, stem_of

MAX_UPLOAD_BYTES = 250 * 1024 * 1024  # 250 MB safety cap

def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"

def _json(data: dict[str, Any], code: int = 200):
    return JSONResponse(content=data, status_code=code)

async def health():
    result = purge_old_files()
    return _json({
        "success": True,
        "message": "TornadoTools File Converter backend is healthy.",
        "data": {
            "ready": True,
            "cleanup": result,
        }
    })

async def warmup():
    # Wake-up endpoint for Render or any cold-start platform.
    result = purge_old_files()
    return _json({
        "success": True,
        "message": "Processing engine warmed and cleanup sweep completed.",
        "data": {
            "ready": True,
            "cleanup": result,
        }
    })

async def capabilities():
    supported = build_capabilities()
    # Keep only realistically supported conversions in the UI.
    return _json({
        "success": True,
        "data": {
            "supportedConversions": supported,
            "sourceCategories": {
                "image": sorted([k for k, v in supported.items() if source_category(k) == "image"]),
                "text-data": sorted([k for k, v in supported.items() if source_category(k) == "text-data"]),
                "spreadsheet": sorted([k for k, v in supported.items() if source_category(k) == "spreadsheet"]),
                "document": sorted([k for k, v in supported.items() if source_category(k) == "document"]),
                "presentation": sorted([k for k, v in supported.items() if source_category(k) == "presentation"]),
                "video": sorted([k for k, v in supported.items() if source_category(k) == "video"]),
                "audio": sorted([k for k, v in supported.items() if source_category(k) == "audio"]),
                "archive": sorted([k for k, v in supported.items() if source_category(k) == "archive"]),
            }
        }
    })

async def convert(request: Request, file: UploadFile = File(...), targetFormat: str = Form(...)):
    limiter.hit(client_ip(request))

    targetFormat = require_target(targetFormat)
    targetFormat = normalise_ext(targetFormat)
    if targetFormat == "extract all":
        targetFormat = "extract"

    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file must be uploaded.")

    original_name = sanitize_filename(file.filename)
    source_ext = ext_of(original_name)
    if not source_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file has no extension.")

    supported = capabilities_for_source(source_ext)
    if targetFormat not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Conversion {source_ext} -> {targetFormat} is not supported yet."
        )

    session_id = os.urandom(8).hex()
    dirs = ensure_session_dirs(session_id)
    input_path = dirs["uploads"] / original_name

    # Write upload to disk in chunks to avoid loading the full file in memory.
    written = 0
    try:
        with input_path.open("wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                                        detail="File too large for this backend.")
                f.write(chunk)

        # Convert
        result = convert_file(input_path, source_ext, targetFormat, dirs)

        # delete upload immediately after successful conversion
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass

        output_path = Path(result["output_path"])
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Conversion completed but output file was not created.")

        response = {
            "success": True,
            "data": {
                "sessionId": session_id,
                "inputFileName": original_name,
                "sourceFormat": source_ext,
                "targetFormat": targetFormat,
                "outputFileName": result["output_file_name"],
                "downloadName": result["download_name"],
                "outputMimeType": result["output_mime"],
                "outputBytes": result["output_size"],
                "downloadUrl": f"/api/converter/download/{result['output_file_name']}",
                "deleteAfterDownload": True,
                "cleanupAt": int(time.time()) + 300,
            }
        }
        return _json(response)

    except HTTPException:
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise
    except Exception as exc:
        logger.exception("Conversion failed: %s", exc)
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass
        # wipe any partially created session artifacts
        delete_session_artifacts(session_id, immediate=True)
        raise HTTPException(status_code=500, detail=f"Conversion failed: {exc}")
    finally:
        try:
            await file.close()
        except Exception:
            pass

async def cleanup_session(session_id: str, request: Request):
    session_id = (session_id or "").strip()
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required.")
    delay_seconds = 0
    if request is not None:
        try:
            body = await request.json()
            delay_seconds = int(body.get("delaySeconds") or 0)
        except Exception:
            delay_seconds = 0
    if delay_seconds and delay_seconds > 0:
        delete_session_artifacts(session_id, immediate=False, delay_seconds=delay_seconds)
        return _json({"success": True, "message": "Cleanup scheduled.", "data": {"sessionId": session_id, "delaySeconds": delay_seconds}})
    delete_session_artifacts(session_id, immediate=True)
    return _json({"success": True, "message": "Cleanup completed.", "data": {"sessionId": session_id}})

async def download(filename: str):
    from utils.temp_files import OUTPUTS_DIR
    safe_name = sanitize_filename(filename)
    if not safe_name:
        raise HTTPException(status_code=404, detail="File not found")

    matches = list(OUTPUTS_DIR.rglob(safe_name))
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")
    file_path = matches[0]
    session_dir = file_path.parent

    media_type = detect_output_mime(file_path.suffix.lstrip("."))
    return FileResponse(
        path=str(file_path),
        filename=safe_name,
        media_type=media_type,
        background=BackgroundTask(delete_session_artifacts, session_dir.name, True, 0),
    )
