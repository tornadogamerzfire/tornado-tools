from __future__ import annotations
from pathlib import Path
from .engine import _best_image_variant

def compress_image(input_path: Path, target_bytes: int, output_dir: Path) -> dict:
    return _best_image_variant(input_path, target_bytes, output_dir)
