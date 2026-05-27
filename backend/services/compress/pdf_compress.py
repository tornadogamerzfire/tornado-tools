from __future__ import annotations
from pathlib import Path
from .engine import compress_pdf

def compress_pdf_file(input_path: Path, target_bytes: int, output_dir: Path) -> dict:
    return compress_pdf(input_path, target_bytes, output_dir)
