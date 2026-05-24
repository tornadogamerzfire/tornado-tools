from __future__ import annotations

import os
import time
import json
import threading
from pathlib import Path
from typing import Iterable

from .logger import logger
from .temp_files import TEMP_DIR, UPLOADS_DIR, OUTPUTS_DIR, remove_tree

MAX_AGE_SECONDS = 300
SCAN_INTERVAL_SECONDS = 60

def _iter_files(root: Path):
    if not root.exists():
        return
    for path in root.rglob("*"):
        if path.is_file():
            yield path

def purge_old_files(max_age_seconds: int = MAX_AGE_SECONDS, roots: Iterable[Path] | None = None) -> dict[str, int]:
    roots = list(roots or [TEMP_DIR, UPLOADS_DIR, OUTPUTS_DIR])
    now = time.time()
    deleted = 0
    scanned = 0
    for root in roots:
        if not root.exists():
            continue
        for file in list(_iter_files(root)):
            scanned += 1
            try:
                age = now - file.stat().st_mtime
                if age > max_age_seconds:
                    file.unlink(missing_ok=True)
                    deleted += 1
            except FileNotFoundError:
                continue
            except Exception as exc:
                logger.warning("Cleanup skipped file=%s err=%s", file, exc)
        # remove empty directories bottom-up
        for d in sorted([p for p in root.rglob("*") if p.is_dir()], reverse=True):
            try:
                if not any(d.iterdir()):
                    d.rmdir()
            except Exception:
                pass
    return {"scanned": scanned, "deleted": deleted}

def delete_session_artifacts(session_id: str, immediate: bool = True, delay_seconds: int = 0) -> bool:
    """
    Deletes temp/uploads/outputs session folders.
    If delay_seconds > 0, schedules a delayed deletion in a background thread.
    """
    session_id = (session_id or "").strip()
    if not session_id:
        return False

    def _do_delete():
        for root in [TEMP_DIR / session_id, UPLOADS_DIR / session_id, OUTPUTS_DIR / session_id]:
            remove_tree(root)
        logger.info("Deleted session artifacts: %s", session_id)

    if delay_seconds > 0:
        threading.Timer(delay_seconds, _do_delete).start()
        return True

    if immediate:
        _do_delete()
    return True

class CleanupScheduler:
    def __init__(self, interval_seconds: int = SCAN_INTERVAL_SECONDS, max_age_seconds: int = MAX_AGE_SECONDS):
        self.interval_seconds = interval_seconds
        self.max_age_seconds = max_age_seconds
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="cleanup-scheduler", daemon=True)
        self._thread.start()
        logger.info("Cleanup scheduler started (interval=%ss max_age=%ss)", self.interval_seconds, self.max_age_seconds)

    def stop(self):
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run(self):
        # Immediate startup sweep
        try:
            purge_old_files(self.max_age_seconds)
        except Exception as exc:
            logger.warning("Initial cleanup sweep failed: %s", exc)

        while not self._stop.wait(self.interval_seconds):
            try:
                result = purge_old_files(self.max_age_seconds)
                logger.info("Cleanup sweep scanned=%s deleted=%s", result["scanned"], result["deleted"])
            except Exception as exc:
                logger.exception("Scheduled cleanup failed: %s", exc)
