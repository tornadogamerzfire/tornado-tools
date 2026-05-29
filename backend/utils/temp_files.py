from __future__ import annotations

import re
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
TEMP_DIR = BASE_DIR / "temp"
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"

for d in (TEMP_DIR, UPLOADS_DIR, OUTPUTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

FILENAME_SAFE_RE = re.compile(r"[^a-zA-Z0-9._-]+")


def ensure_session_dirs(session_id: str) -> dict[str, Path]:
    session_temp = TEMP_DIR / session_id
    session_uploads = UPLOADS_DIR / session_id
    session_outputs = OUTPUTS_DIR / session_id
    for d in (session_temp, session_uploads, session_outputs):
        d.mkdir(parents=True, exist_ok=True)
    return {
        "temp": session_temp,
        "uploads": session_uploads,
        "outputs": session_outputs,
    }


def sanitize_filename(name: str, fallback: str = "file") -> str:
    name = (name or "").strip()
    if not name:
        return fallback
    name = name.replace("\\", "/").split("/")[-1]
    name = FILENAME_SAFE_RE.sub("_", name).strip("._")
    return name or fallback


def stem_of(filename: str, fallback: str = "file") -> str:
    name = sanitize_filename(filename, fallback)
    if "." in name:
        stem = ".".join(name.split(".")[:-1])
        return stem or fallback
    return name or fallback


def ext_of(filename: str) -> str:
    name = sanitize_filename(filename)
    if "." not in name:
        return ""
    return name.rsplit(".", 1)[-1].lower()


def make_output_name(base_stem: str, suffix: str, ext: str) -> str:
    stem = sanitize_filename(base_stem, "file")
    suffix = sanitize_filename(suffix, "converted")
    ext = ext.lower().lstrip(".")
    return f"{stem}_{suffix}.{ext}"


def remove_tree(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


def unique_path(folder: Path, filename: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    candidate = folder / sanitize_filename(filename)
    if not candidate.exists():
        return candidate
    stem = candidate.stem
    suffix = candidate.suffix
    idx = 1
    while True:
        p = folder / f"{stem}_{idx}{suffix}"
        if not p.exists():
            return p
        idx += 1
