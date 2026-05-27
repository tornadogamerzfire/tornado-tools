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
from services.compress.engine import (
    MAX_UPLOAD_BYTES,
    MB,
    KB,
    build_capabilities,
    capabilities_for_source,
    compress_file,
    detect_output_mime,
    normalise_ext,
    source_category,
)
from utils.cleanup import delete_session_artifacts, purge_old_files
from utils.logger import logger
from utils.temp_files import ensure_session_dirs, ext_of, sanitize_filename

MIN_TARGET_BYTES = 8 * KB
TARGET_TOLERANCE_BYTES = 2048

def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"

def _json(data: dict[str, Any], code: int = 200):
    return JSONResponse(content=data, status_code=code)

def _target_to_bytes(target_size: float, unit: str) -> int:
    unit = (unit or "KB").strip().upper()
    if unit not in {"KB", "MB"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unit must be KB or MB.")
    try:
        value = float(target_size)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target size must be a number.")
    if value <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target size must be greater than zero.")
    if unit == "MB":
        value *= 1024
    bytes_value = int(value * 1024)
    if bytes_value < MIN_TARGET_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target size is too small. Please choose at least 8 KB."
        )
    return bytes_value

async def health():
    result = purge_old_files()
    return _json({
        "success": True,
        "message": "TornadoTools File Compressor backend is healthy.",
        "data": {
            "ready": True,
            "service": "compress",
            "cleanup": result,
        }
    })

async def warmup():
    result = purge_old_files()
    return _json({
        "success": True,
        "message": "Compression engine warmed and cleanup sweep completed.",
        "data": {
            "ready": True,
            "service": "compress",
            "cleanup": result,
        }
    })

async def capabilities():
    return _json({
        "success": True,
        "data": build_capabilities(),
    })

async def compress(
    request: Request,
    file: UploadFile = File(...),
    targetSize: str = Form(...),
    targetUnit: str = Form("KB"),
):
    limiter.hit(client_ip(request))

    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A file must be uploaded.")

    original_name = sanitize_filename(file.filename)
    source_ext = ext_of(original_name)
    if not source_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file has no extension.")

    caps = build_capabilities()["supportedInputs"]
    supported_sources = set(caps["image"]) | {"pdf"}
    if source_ext not in supported_sources:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{source_ext}' is not supported for compression yet."
        )

    target_bytes = _target_to_bytes(targetSize, targetUnit)

    session_id = os.urandom(8).hex()
    dirs = ensure_session_dirs(session_id)
    input_path = dirs["uploads"] / original_name

    written = 0
    try:
        with input_path.open("wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File too large for this backend."
                    )
                f.write(chunk)

        result = compress_file(input_path, target_bytes, dirs["outputs"])

        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass

        output_path = Path(result["output_path"])
        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Compression completed but output file was not created.")

        original_size = input_path.stat().st_size if input_path.exists() else written
        output_size = result["output_size"]
        compression_percent = 0.0
        if original_size > 0:
            compression_percent = max(0.0, round((1 - output_size / original_size) * 100, 2))

        response = {
            "success": True,
            "data": {
                "sessionId": session_id,
                "inputFileName": original_name,
                "sourceFormat": source_ext,
                "targetSize": int(target_bytes),
                "targetUnit": targetUnit.upper(),
                "originalBytes": int(original_size),
                "outputFileName": result["output_file_name"],
                "downloadName": result["download_name"],
                "outputMimeType": result["output_mime"],
                "outputBytes": int(output_size),
                "compressionPercent": compression_percent,
                "method": result.get("method", "compress"),
                "downloadUrl": f"/api/compress/download/{result['output_file_name']}",
                "deleteAfterDownload": True,
                "cleanupAt": int(time.time()) + 300,
                "targetToleranceBytes": TARGET_TOLERANCE_BYTES,
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
        logger.exception("Compression failed: %s", exc)
        try:
            input_path.unlink(missing_ok=True)
        except Exception:
            pass
        delete_session_artifacts(session_id, immediate=True)
        raise HTTPException(status_code=500, detail=f"Compression failed: {exc}")
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
    media_type = detect_output_mime(file_path.suffix.lstrip("."))
    session_id = file_path.parent.name

    return FileResponse(
        path=str(file_path),
        filename=safe_name,
        media_type=media_type,
        background=BackgroundTask(delete_session_artifacts, session_id, True, 0),
    )
