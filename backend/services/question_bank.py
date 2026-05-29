from __future__ import annotations

import json
from pathlib import Path
import os
from random import Random
from typing import Any, Dict, List, Sequence

from utils.logger import logger
from utils.text import slugify


QUESTION_TYPES = {
    "mcq": "mcq.json",
    "true_false": "true-false.json",
    "fill_blank": "fill-blanks.json",
}


def question_bank_root() -> Path:
    raw = os.getenv("QUESTION_BANK_ROOT", "").strip()
    if raw:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = Path(__file__).resolve().parents[1] / candidate
        return candidate
    return Path(__file__).resolve().parents[1] / "data" / "question-bank"


def _candidate_paths(payload: Dict[str, Any], question_type: str) -> List[Path]:
    root = question_bank_root()
    level = slugify(payload.get("level", ""))
    branch = slugify(payload.get("branch", ""))
    semester = slugify(payload.get("semester", ""))
    subject = slugify(payload.get("subject", payload.get("topic", "")))
    difficulty = slugify(payload.get("difficulty", "medium"))
    filename = QUESTION_TYPES.get(question_type, f"{slugify(question_type)}.json")

    candidates: List[Path] = []

    # Structure variant 1: level / branch / semester / subjects / subject / difficulty / file
    parts_subjects = [root, level]
    if branch:
        parts_subjects.append(branch)
    if semester:
        parts_subjects.append(f"semester-{semester}")
    parts_subjects.extend(["subjects", subject, difficulty, filename])
    candidates.append(Path(*parts_subjects))

    # Structure variant 2: level / branch / semester / subject / difficulty / file
    parts_direct = [root, level]
    if branch:
        parts_direct.append(branch)
    if semester:
        parts_direct.append(f"semester-{semester}")
    parts_direct.extend([subject, difficulty, filename])
    candidates.append(Path(*parts_direct))

    # Structure variant 3: level / subject / difficulty / file
    candidates.append(Path(root, level, subject, difficulty, filename))

    return candidates


def _load_json_list(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists() or not file_path.is_file():
        return []
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            for key in ("questions", "items", "data"):
                if isinstance(data.get(key), list):
                    data = data[key]
                    break
        if not isinstance(data, list):
            return []
        return [item for item in data if isinstance(item, dict)]
    except Exception as exc:
        logger.warning("Failed to read question bank file %s: %s", file_path, exc)
        return []


def load_from_bank(payload: Dict[str, Any], question_types: Sequence[str], count: int, seed: str) -> List[Dict[str, Any]]:
    rng = Random(seed)
    collected: List[Dict[str, Any]] = []
    seen_ids = set()

    for question_type in question_types:
        file_path = None
        for candidate in _candidate_paths(payload, question_type):
            if candidate.exists():
                file_path = candidate
                break
        if file_path is None:
            continue

        items = _load_json_list(file_path)
        rng.shuffle(items)
        for item in items:
            qid = str(item.get("id") or item.get("qid") or item.get("questionId") or "").strip()
            if not qid:
                qid = f"{question_type}-{slugify(str(item.get('question', '')))}"
            if qid in seen_ids:
                continue
            question_text = str(item.get("question") or item.get("prompt") or "").strip()
            if not question_text:
                continue
            seen_ids.add(qid)
            collected.append({
                "id": qid,
                "type": question_type,
                "question": question_text,
                "options": list(item.get("options") or []),
                "answer": item.get("answer"),
                "explanation": str(item.get("explanation") or "").strip(),
            })

    rng.shuffle(collected)
    return collected[:count]
