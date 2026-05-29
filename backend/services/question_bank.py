from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from random import Random
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from utils.logger import logger
from utils.text import slugify

QUESTION_TYPES = {
    "mcq": "mcq.json",
    "true_false": "true-false.json",
    "fill_blank": "fill-blanks.json",
}

DIFFICULTIES = ("easy", "medium", "hard")


def _normalize(value: Any) -> str:
    return slugify(str(value or "").replace("_", " ").replace("/", " "))


def _title_case_from_slug(value: str) -> str:
    if not value:
        return ""
    return " ".join(part.capitalize() for part in value.replace("_", "-").split("-") if part)


def _label_from_level(value: str) -> str:
    if value.startswith("class-"):
        suffix = value.split("-", 1)[1]
        return f"Class {suffix}"
    if value == "iti":
        return "ITI"
    if value == "iit":
        return "IIT / JEE"
    if value == "upsc":
        return "UPSC"
    if value == "ssc":
        return "SSC"
    if value == "nda":
        return "NDA"
    if value == "cuet":
        return "CUET"
    if value == "rrb":
        return "Railway"
    if value == "competitive":
        return "Competitive Exams"
    if value == "graduation":
        return "Graduation"
    if value == "diploma":
        return "Diploma"
    return _title_case_from_slug(value)


def _label_from_value(value: str) -> str:
    if value.startswith("semester-"):
        return f"Semester {value.split('-', 1)[1]}"
    if value.startswith("class-"):
        return f"Class {value.split('-', 1)[1]}"
    if value == "jee-main":
        return "JEE Main"
    if value == "jee-advanced":
        return "JEE Advanced"
    if value == "cse":
        return "CSE"
    if value == "btech":
        return "BTech"
    if value == "bca":
        return "BCA"
    if value == "bcom":
        return "BCom"
    if value == "bsc":
        return "BSc"
    if value == "ba":
        return "BA"
    return _title_case_from_slug(value)


def question_bank_root() -> Path:
    raw = (os.getenv("QUESTION_BANK_ROOT") or os.getenv("QUESTION_BANK_PATH") or "").strip()
    if raw:
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = Path(__file__).resolve().parents[1] / candidate
        return candidate
    return Path(__file__).resolve().parents[1] / "data" / "question-bank"


def _read_json(file_path: Path) -> List[Dict[str, Any]]:
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Failed to read question bank file %s: %s", file_path, exc)
        return []

    if isinstance(data, dict):
        for key in ("questions", "items", "data"):
            if isinstance(data.get(key), list):
                data = data[key]
                break

    if not isinstance(data, list):
        return []

    return [item for item in data if isinstance(item, dict)]


def _scan_question_bank() -> Dict[str, Any]:
    root = question_bank_root()
    catalog: Dict[str, Any] = {
        "root": str(root),
        "levels": [],
        "questionTypes": list(QUESTION_TYPES.keys()),
        "difficulties": list(DIFFICULTIES),
    }

    if not root.exists():
        return catalog

    levels: Dict[str, Dict[str, Any]] = {}

    def ensure_level(value: str, label: str, kind: str) -> Dict[str, Any]:
        level = levels.get(value)
        if level is None:
            level = {
                "value": value,
                "label": label,
                "kind": kind,
                "branches": [],
                "subjects": [],
                "semesters": [],
                "branchesByValue": {},
                "subjectsByBranch": {},
                "semestersByBranch": {},
                "subjectsByBranchSemester": {},
            }
            levels[value] = level
        return level

    for json_path in root.rglob("*.json"):
        try:
            rel = json_path.relative_to(root)
        except ValueError:
            continue
        parts = rel.parts
        if len(parts) < 4:
            continue

        top = parts[0]
        if top == "school" and len(parts) >= 5:
            level_value = parts[1]
            subject_value = parts[2]
            difficulty = parts[3]
            if difficulty not in DIFFICULTIES:
                continue
            level = ensure_level(level_value, _label_from_level(level_value), "school")
            level.setdefault("subjectsByDifficulty", {})
            level["subjects"].append(subject_value)
        elif top in {"diploma", "iti"}:
            # level/branch/semester-#/subjects/subject/difficulty/file
            if "subjects" not in parts or len(parts) < 7:
                continue
            branch_value = parts[1]
            semester_value = parts[2]
            subject_index = parts.index("subjects") + 1
            subject_value = parts[subject_index]
            difficulty = parts[subject_index + 1]
            if difficulty not in DIFFICULTIES:
                continue
            level = ensure_level(top, _label_from_level(top), "branch-semester")
            level["branches"].append(branch_value)
            level["semesters"].append(semester_value)
            level["subjectsByBranch"].setdefault(branch_value, [])
            level["subjectsByBranch"][branch_value].append(subject_value)
            level["semestersByBranch"].setdefault(branch_value, [])
            level["semestersByBranch"][branch_value].append(semester_value)
            level["subjectsByBranchSemester"].setdefault(branch_value, {}).setdefault(semester_value, [])
            level["subjectsByBranchSemester"][branch_value][semester_value].append(subject_value)
        elif top == "graduation" and len(parts) >= 5:
            branch_value = parts[1]
            semester_value = parts[2]
            subject_value = parts[3]
            difficulty = parts[4]
            if difficulty not in DIFFICULTIES:
                continue
            level = ensure_level(top, _label_from_level(top), "branch-semester")
            level["branches"].append(branch_value)
            level["semesters"].append(semester_value)
            level["subjectsByBranch"].setdefault(branch_value, [])
            level["subjectsByBranch"][branch_value].append(subject_value)
            level["semestersByBranch"].setdefault(branch_value, [])
            level["semestersByBranch"][branch_value].append(semester_value)
            level["subjectsByBranchSemester"].setdefault(branch_value, {}).setdefault(semester_value, [])
            level["subjectsByBranchSemester"][branch_value][semester_value].append(subject_value)
        elif top in {"iit", "competitive"} and len(parts) >= 4:
            branch_value = parts[1]
            subject_value = parts[2]
            difficulty = parts[3]
            if difficulty not in DIFFICULTIES:
                continue
            level = ensure_level(top, _label_from_level(top), "branch-subject")
            level["branches"].append(branch_value)
            level["subjectsByBranch"].setdefault(branch_value, [])
            level["subjectsByBranch"][branch_value].append(subject_value)

    for value, level in levels.items():
        level["branches"] = [
            {"value": branch, "label": _label_from_value(branch)}
            for branch in sorted(set(level["branches"]), key=str.lower)
        ]
        if level["kind"] == "school":
            level["subjects"] = [
                {"value": subject, "label": _label_from_value(subject)}
                for subject in sorted(set(level["subjects"]), key=str.lower)
            ]
        else:
            level["semesters"] = [
                {"value": semester, "label": _label_from_value(semester)}
                for semester in sorted(set(level["semesters"]), key=str.lower)
            ]
            level["subjectsByBranch"] = {
                branch: [
                    {"value": subject, "label": _label_from_value(subject)}
                    for subject in sorted(set(subjects), key=str.lower)
                ]
                for branch, subjects in level["subjectsByBranch"].items()
            }
            level["semestersByBranch"] = {
                branch: [
                    {"value": semester, "label": _label_from_value(semester)}
                    for semester in sorted(set(semesters), key=str.lower)
                ]
                for branch, semesters in level["semestersByBranch"].items()
            }
            level["subjectsByBranchSemester"] = {
                branch: {
                    semester: [
                        {"value": subject, "label": _label_from_value(subject)}
                        for subject in sorted(set(subjects), key=str.lower)
                    ]
                    for semester, subjects in semesters.items()
                }
                for branch, semesters in level["subjectsByBranchSemester"].items()
            }

    catalog["levels"] = [
        levels[key]
        for key in sorted(levels.keys(), key=str.lower)
        if key.startswith("class-") or key in {"diploma", "iti", "graduation", "iit", "competitive"}
    ]
    return catalog


@lru_cache(maxsize=1)
def get_question_bank_catalog() -> Dict[str, Any]:
    return _scan_question_bank()


def _flatten_catalog_values() -> Dict[str, Dict[str, Dict[str, set[str]]]]:
    catalog = get_question_bank_catalog()
    flattened: Dict[str, Dict[str, Dict[str, set[str]]]] = {}
    for level in catalog.get("levels", []):
        kind = level.get("kind", "")
        value = str(level.get("value") or "")
        flattened.setdefault(kind, {})[value] = {}
        if kind == "school":
            flattened[kind][value]["subjects"] = {str(item["value"]) for item in level.get("subjects", [])}
        elif kind == "branch-semester":
            subjects_by_branch = level.get("subjectsByBranchSemester", {})
            for branch, semesters in subjects_by_branch.items():
                flattened[kind].setdefault(value, {}).setdefault(branch, set())
                for semester, subjects in semesters.items():
                    flattened[kind][value].setdefault(branch, set()).update(str(item["value"]) for item in subjects)
        elif kind == "branch-subject":
            subjects_by_branch = level.get("subjectsByBranch", {})
            for branch, subjects in subjects_by_branch.items():
                flattened[kind].setdefault(value, {}).setdefault(branch, set()).update(str(item["value"]) for item in subjects)
    return flattened


def _match_item(value: str, items: Sequence[Dict[str, Any]]) -> Optional[str]:
    if not value or not items:
        return None
    normalized = _normalize(value)
    for item in items:
        candidate = str(item.get("value") or "")
        if normalized in {_normalize(candidate), _normalize(item.get("label"))}:
            return candidate
    for item in items:
        candidate = str(item.get("value") or "")
        if normalized == _normalize(candidate) or normalized in _normalize(candidate) or _normalize(candidate) in normalized:
            return candidate
    return None


def _match_from_text(value: str, candidates: Iterable[str]) -> Optional[str]:
    if not value:
        return None
    normalized = _normalize(value)
    for candidate in candidates:
        if normalized == _normalize(candidate):
            return candidate
    for candidate in candidates:
        if normalized in _normalize(candidate) or _normalize(candidate) in normalized:
            return candidate
    return None


def _resolve_level_and_branch(payload: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    level_raw = str(payload.get("level") or "").strip()
    branch_raw = str(payload.get("branch") or "").strip()

    # Backward compatibility with the old exam-per-level UI.
    legacy_exam_levels = {
        "upsc": ("competitive", "upsc"),
        "ssc": ("competitive", "ssc"),
        "railway": ("competitive", "railway"),
        "banking": ("competitive", "banking"),
        "nda": ("competitive", "nda"),
        "cuet": ("competitive", "cuet"),
        "jee-main": ("iit", "jee-main"),
        "jee-advanced": ("iit", "jee-advanced"),
    }
    normalized_level = _normalize(level_raw)
    if normalized_level in legacy_exam_levels:
        return legacy_exam_levels[normalized_level]

    catalog = get_question_bank_catalog()
    level_entry = None
    for item in catalog.get("levels", []):
        if normalized_level == _normalize(item.get("value")) or normalized_level == _normalize(item.get("label")):
            level_entry = item
            break
    if not level_entry:
        return None, None

    kind = str(level_entry.get("kind") or "")
    if kind == "school":
        return str(level_entry.get("value") or ""), None

    if kind == "branch-semester":
        branch = _match_item(branch_raw, level_entry.get("branches", []))
        if not branch:
            return None, None
        return str(level_entry.get("value") or ""), branch

    if kind == "branch-subject":
        branch = _match_item(branch_raw, level_entry.get("branches", []))
        if not branch:
            return None, None
        return str(level_entry.get("value") or ""), branch

    return None, None


def _resolve_semester_and_subject(payload: Dict[str, Any], level: str, branch: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    semester_raw = str(payload.get("semester") or "").strip()
    subject_raw = str(payload.get("subject") or payload.get("topic") or "").strip()
    catalog = get_question_bank_catalog()
    level_entry = next((item for item in catalog.get("levels", []) if str(item.get("value")) == level), None)
    if not level_entry:
        return None, None

    kind = str(level_entry.get("kind") or "")
    if kind == "school":
        subject = _match_item(subject_raw, level_entry.get("subjects", []))
        return None, subject

    if kind == "branch-semester":
        if not branch:
            return None, None
        semester = _match_item(semester_raw, level_entry.get("semestersByBranch", {}).get(branch, []))
        if not semester:
            # Accept direct text if it matches the bank layout and no branch-specific list exists.
            semester = _match_from_text(semester_raw, [item["value"] for item in level_entry.get("semesters", [])])
        if not semester:
            return None, None
        subjects = level_entry.get("subjectsByBranchSemester", {}).get(branch, {}).get(semester, [])
        subject = _match_item(subject_raw, subjects)
        return semester, subject

    if kind == "branch-subject":
        if not branch:
            return None, None
        subjects = level_entry.get("subjectsByBranch", {}).get(branch, [])
        subject = _match_item(subject_raw, subjects)
        return None, subject

    return None, None


def _candidate_paths(payload: Dict[str, Any], question_type: str) -> List[Path]:
    root = question_bank_root()
    difficulty = _normalize(payload.get("difficulty", "medium")) or "medium"
    filename = QUESTION_TYPES.get(question_type, f"{_normalize(question_type)}.json")

    level, branch = _resolve_level_and_branch(payload)
    if not level:
        return []

    semester, subject = _resolve_semester_and_subject(payload, level, branch)
    if not subject:
        return []

    candidates: List[Path] = []
    if level.startswith("class-"):
        candidates.append(root / "school" / level / subject / difficulty / filename)
        return candidates

    if level in {"diploma", "iti"}:
        if semester:
            candidates.append(root / level / branch / semester / "subjects" / subject / difficulty / filename)
            candidates.append(root / level / branch / semester / subject / difficulty / filename)
        return candidates

    if level == "graduation":
        if semester:
            candidates.append(root / level / branch / semester / subject / difficulty / filename)
        return candidates

    if level in {"iit", "competitive"}:
        candidates.append(root / level / branch / subject / difficulty / filename)
        return candidates

    return candidates


def _load_json_list(file_path: Path) -> List[Dict[str, Any]]:
    if not file_path.exists() or not file_path.is_file():
        return []
    return _read_json(file_path)


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
