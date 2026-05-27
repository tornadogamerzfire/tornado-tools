from __future__ import annotations

import io
import math
import os
import shutil
from pathlib import Path
from typing import Any, Iterable

import fitz  # PyMuPDF
from PIL import Image, ImageOps

from utils.logger import logger
from utils.temp_files import (
    ensure_session_dirs,
    ext_of,
    make_output_name,
    sanitize_filename,
    stem_of,
    unique_path,
)

IMAGE_INPUT_EXTS = {"png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"}
PDF_INPUT_EXTS = {"pdf"}
SUPPORTED_INPUTS = IMAGE_INPUT_EXTS | PDF_INPUT_EXTS

MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB safety cap
TARGET_TOLERANCE_BYTES = 2048
MIN_TARGET_BYTES = 8 * 1024
KB = 1024
MB = 1024 * 1024

def normalise_ext(ext: str) -> str:
    return (ext or "").strip().lower().lstrip(".")

def source_category(ext: str) -> str:
    ext = normalise_ext(ext)
    if ext in IMAGE_INPUT_EXTS:
        return "image"
    if ext in PDF_INPUT_EXTS:
        return "pdf"
    return "unknown"

def detect_output_mime(ext: str) -> str:
    ext = normalise_ext(ext)
    return {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "png": "image/png",
        "pdf": "application/pdf",
    }.get(ext, "application/octet-stream")

def build_capabilities() -> dict[str, Any]:
    return {
        "supportedInputs": {
            "image": sorted(IMAGE_INPUT_EXTS),
            "pdf": ["pdf"],
        },
        "supportedCategories": ["image", "pdf"],
        "supportedTargetUnits": ["KB", "MB"],
        "maxUploadBytes": MAX_UPLOAD_BYTES,
        "minTargetBytes": MIN_TARGET_BYTES,
        "targetToleranceBytes": TARGET_TOLERANCE_BYTES,
        "notes": [
            "Image compression is fully supported.",
            "PDF compression is supported on a best-effort basis.",
            "Office documents, video, and archive types are not enabled in this build."
        ],
    }

def capabilities_for_source(source_ext: str) -> dict[str, Any]:
    source_ext = normalise_ext(source_ext)
    return {
        "sourceExt": source_ext,
        "category": source_category(source_ext),
        "supported": source_ext in SUPPORTED_INPUTS,
        "targetUnits": ["KB", "MB"],
        "isLossy": source_ext in IMAGE_INPUT_EXTS or source_ext in PDF_INPUT_EXTS,
    }

def _resize_image(image: Image.Image, scale: float) -> Image.Image:
    if scale >= 0.999:
        return image.copy()
    width = max(1, int(image.width * scale))
    height = max(1, int(image.height * scale))
    resample = getattr(Image, "Resampling", Image).LANCZOS
    return image.resize((width, height), resample=resample)

def _save_image_bytes(img: Image.Image, fmt: str, quality: int | None, alpha: bool) -> bytes:
    buffer = io.BytesIO()
    save_kwargs: dict[str, Any] = {}

    fmt = normalise_ext(fmt)

    if fmt in {"jpg", "jpeg"}:
        work = img.convert("RGBA") if alpha else img.convert("RGB")
        if alpha:
            background = Image.new("RGBA", work.size, (255, 255, 255, 255))
            background.alpha_composite(work)
            work = background.convert("RGB")
        else:
            work = work.convert("RGB")
        save_kwargs = {
            "format": "JPEG",
            "quality": int(quality or 80),
            "optimize": True,
            "progressive": True,
            "subsampling": 0,
        }
        work.save(buffer, **save_kwargs)
        return buffer.getvalue()

    if fmt == "webp":
        work = img.convert("RGBA") if alpha else img.convert("RGB")
        save_kwargs = {
            "format": "WEBP",
            "quality": int(quality or 80),
            "method": 6,
            "exact": True,
        }
        work.save(buffer, **save_kwargs)
        return buffer.getvalue()

    if fmt == "png":
        work = img.convert("RGBA") if alpha else img.convert("RGB")
        # PNG quality is mostly about color count and compression level.
        save_kwargs = {
            "format": "PNG",
            "optimize": True,
            "compress_level": 9,
        }
        work.save(buffer, **save_kwargs)
        return buffer.getvalue()

    raise ValueError(f"Unsupported image output format: {fmt}")

def _binary_search_variant(img: Image.Image, fmt: str, target_bytes: int, alpha: bool) -> tuple[bytes, int, int]:
    low, high = 15, 95
    best_data = b""
    best_size = 10**18
    best_quality = 80

    while low <= high:
        quality = (low + high) // 2
        data = _save_image_bytes(img, fmt, quality, alpha)
        size = len(data)

        if abs(size - target_bytes) < abs(best_size - target_bytes):
            best_data = data
            best_size = size
            best_quality = quality

        if size > target_bytes + TARGET_TOLERANCE_BYTES:
            high = quality - 1
        elif size < target_bytes - TARGET_TOLERANCE_BYTES:
            low = quality + 1
        else:
            return data, size, quality

    return best_data, best_size, best_quality

def _best_image_variant(image_path: Path, target_bytes: int, output_dir: Path) -> dict[str, Any]:
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)

    # Reject animation for now. It is too easy to create unstable output.
    if getattr(img, "is_animated", False) and getattr(img, "n_frames", 1) > 1:
        raise ValueError("Animated images are not supported in the current compressor build.")

    has_alpha = "A" in img.getbands() or img.mode in {"RGBA", "LA"} or ("transparency" in img.info)
    source_ext = ext_of(image_path.name)

    if source_ext in {"jpg", "jpeg"}:
        candidate_formats = ["jpg", "webp"]
    elif source_ext == "webp":
        candidate_formats = ["webp", "jpg"]
    elif has_alpha:
        candidate_formats = ["webp", "png"]
    else:
        candidate_formats = ["webp", "jpg"]

    scales = [1.0, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46, 0.4]
    best: dict[str, Any] | None = None

    for scale in scales:
        scaled = _resize_image(img, scale)
        for fmt in candidate_formats:
            try:
                data, size, quality = _binary_search_variant(scaled, fmt, target_bytes, has_alpha)
            except Exception as exc:
                logger.warning("Image variant generation failed scale=%s fmt=%s err=%s", scale, fmt, exc)
                continue

            if not data:
                continue

            out_ext = "jpeg" if fmt == "jpg" else fmt
            if best is None or abs(size - target_bytes) < abs(best["output_size"] - target_bytes):
                best = {
                    "format": out_ext,
                    "quality": quality,
                    "scale": scale,
                    "data": data,
                    "output_size": size,
                }

            if size <= target_bytes + TARGET_TOLERANCE_BYTES and size >= target_bytes - TARGET_TOLERANCE_BYTES:
                break
        if best and best["output_size"] <= target_bytes + TARGET_TOLERANCE_BYTES:
            break

    if best is None:
        raise ValueError("Could not compress image.")

    output_ext = best["format"]
    output_name = make_output_name(stem_of(image_path.name), "compressed", output_ext)
    output_path = unique_path(output_dir, output_name)
    output_path.write_bytes(best["data"])

    return {
        "output_path": str(output_path),
        "output_file_name": output_path.name,
        "download_name": output_path.name,
        "output_mime": detect_output_mime(output_ext),
        "output_size": output_path.stat().st_size,
        "method": f"image:{output_ext}",
        "quality": best["quality"],
        "scale": best["scale"],
    }

def _save_pdf_native(input_path: Path, output_path: Path) -> int:
    doc = fitz.open(str(input_path))
    try:
        doc.save(
            str(output_path),
            garbage=4,
            deflate=True,
            clean=True,
            use_objstms=1,
            expand=0,
        )
    finally:
        doc.close()
    return output_path.stat().st_size

def _jpeg_bytes_from_pixmap(pix: fitz.Pixmap, quality: int) -> bytes:
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality, optimize=True, progressive=True, subsampling=0)
    return buffer.getvalue()

def _rasterize_pdf(input_path: Path, output_dir: Path, target_bytes: int) -> dict[str, Any]:
    src = fitz.open(str(input_path))
    try:
        page_rects = [page.rect for page in src]
        dpi_candidates = [144, 108, 72]
        quality_candidates = [80, 65, 50]
        best: dict[str, Any] | None = None

        for dpi in dpi_candidates:
            for quality in quality_candidates:
                try:
                    out_doc = fitz.open()
                    matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
                    for idx, page in enumerate(src):
                        pix = page.get_pixmap(matrix=matrix, alpha=False)
                        img_bytes = _jpeg_bytes_from_pixmap(pix, quality)
                        rect = page_rects[idx]
                        out_page = out_doc.new_page(width=rect.width, height=rect.height)
                        out_page.insert_image(out_page.rect, stream=img_bytes, keep_proportion=True)
                    output_name = make_output_name(stem_of(input_path.name), "compressed", "pdf")
                    output_path = unique_path(output_dir, output_name)
                    out_doc.save(
                        str(output_path),
                        garbage=4,
                        deflate=True,
                        clean=True,
                        use_objstms=1,
                        expand=0,
                    )
                    out_doc.close()
                    size = output_path.stat().st_size
                    if best is None or abs(size - target_bytes) < abs(best["output_size"] - target_bytes):
                        best = {
                            "output_path": str(output_path),
                            "output_file_name": output_path.name,
                            "download_name": output_path.name,
                            "output_mime": detect_output_mime("pdf"),
                            "output_size": size,
                            "method": f"pdf:raster:dpi={dpi}:quality={quality}",
                            "dpi": dpi,
                            "quality": quality,
                        }
                    if (
                         size <= target_bytes
                         and size >= target_bytes - TARGET_TOLERANCE_BYTES
                       ):
                        return best
                except Exception as exc:
                    logger.warning("PDF raster pass failed dpi=%s quality=%s err=%s", dpi, quality, exc)
                    continue
        if best is None:
            raise ValueError("Could not compress PDF.")
        return best
    finally:
        src.close()

def compress_pdf(input_path: Path, target_bytes: int, output_dir: Path) -> dict[str, Any]:
    original_size = input_path.stat().st_size
    native_name = make_output_name(stem_of(input_path.name), "compressed", "pdf")
    native_path = unique_path(output_dir, native_name)

    try:
        native_size = _save_pdf_native(input_path, native_path)
    except Exception as exc:
        logger.warning("Native PDF optimization failed, falling back to rasterization: %s", exc)
        return _rasterize_pdf(input_path, output_dir, target_bytes)

    result = {
        "output_path": str(native_path),
        "output_file_name": native_path.name,
        "download_name": native_path.name,
        "output_mime": detect_output_mime("pdf"),
        "output_size": native_size,
        "method": "pdf:native",
    }

    if native_size <= target_bytes + TARGET_TOLERANCE_BYTES:
        return result

    try:
        raster_result = _rasterize_pdf(input_path, output_dir, target_bytes)
        if abs(raster_result["output_size"] - target_bytes) < abs(native_size - target_bytes):
            return raster_result
    except Exception as exc:
        logger.warning("PDF raster fallback failed, using native result: %s", exc)

    return result

def compress_file(input_path: Path, target_bytes: int, output_dir: Path) -> dict[str, Any]:
    source_ext = normalise_ext(ext_of(input_path.name))
    if source_ext in IMAGE_INPUT_EXTS:
        return _best_image_variant(input_path, target_bytes, output_dir)
    if source_ext in PDF_INPUT_EXTS:
        return compress_pdf(input_path, target_bytes, output_dir)
    raise ValueError(f"Unsupported file type for compression: {source_ext}")

