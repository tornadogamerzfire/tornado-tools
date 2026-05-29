from __future__ import annotations

import os
from random import Random
from typing import Any, Dict, List

from models.quiz_models import QuizBuildRequest
from services.nim_client import NimQuizClient
from services.question_bank import get_question_bank_catalog, load_from_bank, question_bank_root
from services.session_store import QuizSessionStore
from utils.text import normalize_answer, slugify


SUPPORTED_TYPES = ["mcq", "true_false", "fill_blank"]
SUPPORTED_LEVELS = ["class-1", "class-2", "class-3", "class-4", "class-5", "class-6", "class-7", "class-8", "class-9", "class-10", "class-11", "class-12", "diploma", "iti", "graduation", "iit", "competitive", "other"]
SUPPORTED_DIFFICULTIES = ["easy", "medium", "hard"]
SUPPORTED_TIMER_MINUTES = [5, 10, 15, 20, 30, 45, 60]
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "7200"))


class QuizService:
    def __init__(self, session_store: QuizSessionStore) -> None:
        self.session_store = session_store
        self.ai = NimQuizClient(
            api_key=os.getenv("NIM_API_KEY", "ABC123"),
            model=os.getenv("NIM_MODEL", "mistral-large-3-675b-instruct-2512"),
            api_url=os.getenv("NIM_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions"),
        )

    def capabilities(self) -> Dict[str, Any]:
        return {
            "supportedLevels": SUPPORTED_LEVELS,
            "supportedQuestionTypes": SUPPORTED_TYPES,
            "supportedDifficulties": SUPPORTED_DIFFICULTIES,
            "supportedTimerMinutes": SUPPORTED_TIMER_MINUTES,
            "limits": {
                "minQuestions": 5,
                "maxQuestions": 30,
                "maxQuestionsPerQuiz": 30,
                "dailyLimitPerIp": 10,
                "simultaneousRequestsPerIp": 2,
            },
            "questionBankRoot": str(question_bank_root()),
            "bankCatalog": get_question_bank_catalog(),
            "aiFallback": True,
            "note": "Question bank is checked first. AI is used only when the requested bank path cannot be found.",
        }

    def _question_count(self, payload: QuizBuildRequest) -> int:
        if payload.count_mode in {"auto", "random"}:
            low = int(payload.random_min or 5)
            high = int(payload.random_max or payload.question_count or 10)
            low = max(5, min(low, 30))
            high = max(5, min(high, 30))
            if low > high:
                low, high = high, low
            return Random().randint(low, high)
        return max(5, min(int(payload.question_count), 30))

    def _timer_seconds(self, payload: QuizBuildRequest) -> int:
        if payload.timer_mode == "no_limit":
            return 0
        return int(payload.timer_minutes or 10) * 60

    def _public_level_payload(self, payload: QuizBuildRequest) -> Dict[str, Any]:
        data = payload.model_dump(by_alias=False)
        if data.get("count_mode") == "random":
            data["count_mode"] = "auto"
        return data

    def _normalize_question(self, question: Dict[str, Any], index: int) -> Dict[str, Any]:
        qtype = str(question.get("type") or "mcq").strip()
        qid = str(question.get("id") or f"quiz-{index}").strip()
        question_text = str(question.get("question") or "").strip()
        options = list(question.get("options") or [])
        answer = question.get("answer")
        explanation = str(question.get("explanation") or "").strip()
        if qtype == "true_false":
            options = ["True", "False"]
        if qtype == "fill_blank":
            options = []
        if qtype == "mcq" and options:
            Random().shuffle(options)
        return {
            "id": qid,
            "type": qtype,
            "question": question_text,
            "options": options[:4],
            "answer": answer,
            "explanation": explanation,
            "points": 1,
        }

    async def build_quiz(self, payload: QuizBuildRequest) -> Dict[str, Any]:
        count = self._question_count(payload)
        question_types = [qt for qt in payload.question_types if qt in SUPPORTED_TYPES] or ["mcq"]
        bank_payload = self._public_level_payload(payload)
        seed = f"{slugify(payload.topic)}-{slugify(payload.level)}-{slugify(payload.difficulty)}-{count}"
        bank_questions = load_from_bank(bank_payload, question_types, count, seed)

        if len(bank_questions) >= count:
            questions_source = bank_questions
            source = "bank"
        else:
            questions_source, source = await self.ai.generate(bank_payload, count, question_types)

        cleaned: List[Dict[str, Any]] = []
        answer_key: Dict[str, Any] = {}
        seen_ids = set()

        for idx, question in enumerate(questions_source, start=1):
            normalized = self._normalize_question(question, idx)
            if not normalized["question"] or normalized["id"] in seen_ids:
                continue
            seen_ids.add(normalized["id"])
            answer_key[normalized["id"]] = normalized["answer"]
            cleaned.append({
                "id": normalized["id"],
                "type": normalized["type"],
                "question": normalized["question"],
                "options": normalized["options"],
                "points": 1,
            })

        attempts = 0
        while len(cleaned) < count and attempts < 3:
            remaining = count - len(cleaned)
            topup, topup_source = await self.ai.generate(bank_payload, remaining, question_types)
            if source == "bank":
                source = topup_source
            elif source != topup_source:
                source = "hybrid"
            for idx, question in enumerate(topup, start=len(cleaned) + 1):
                normalized = self._normalize_question(question, idx)
                if not normalized["question"] or normalized["id"] in seen_ids:
                    continue
                seen_ids.add(normalized["id"])
                answer_key[normalized["id"]] = normalized["answer"]
                cleaned.append({
                    "id": normalized["id"],
                    "type": normalized["type"],
                    "question": normalized["question"],
                    "options": normalized["options"],
                    "points": 1,
                })
            attempts += 1

        cleaned = cleaned[:count]
        quiz_id = os.urandom(6).hex()
        quiz_payload = {
            "quizId": quiz_id,
            "topic": payload.topic,
            "subject": payload.subject or payload.topic,
            "level": payload.level,
            "branch": payload.branch or "",
            "semester": payload.semester or "",
            "difficulty": payload.difficulty,
            "questionCount": len(cleaned),
            "timeLimitSeconds": self._timer_seconds(payload),
            "source": source,
            "questions": cleaned,
        }

        session = self.session_store.create(
            quiz_id=quiz_id,
            payload=quiz_payload,
            answer_key=answer_key,
            ttl_seconds=max(SESSION_TTL_SECONDS, quiz_payload["timeLimitSeconds"] + 900),
        )

        return {
            "quiz": quiz_payload,
            "sessionToken": session.session_token,
        }

    def submit(self, session_token: str, answers: Dict[str, Any], elapsed_seconds: int | None = None) -> Dict[str, Any]:
        session = self.session_store.get(session_token)
        if not session:
            return {
                "score": 0,
                "total": 0,
                "percentage": 0.0,
                "grade": "Fail",
                "correctCount": 0,
                "wrongCount": 0,
                "skippedCount": 0,
                "mode": "quiz",
            }

        questions = session.payload.get("questions") or []
        answer_key = session.answer_key or {}
        score = 0
        correct = 0
        wrong = 0
        skipped = 0

        for question in questions:
            qid = str(question.get("id") or "")
            if not qid:
                continue
            provided = answers.get(qid)
            if provided is None or str(provided).strip() == "":
                skipped += 1
                continue
            expected = answer_key.get(qid)
            if normalize_answer(expected) == normalize_answer(provided):
                correct += 1
                score += 1
            else:
                wrong += 1

        total = len(questions)
        percentage = round((score / total) * 100, 2) if total else 0.0
        grade = "Fail"
        if percentage >= 90:
            grade = "A+"
        elif percentage >= 80:
            grade = "A"
        elif percentage >= 70:
            grade = "B"
        elif percentage >= 60:
            grade = "C"
        elif percentage >= 40:
            grade = "D"

        self.session_store.delete(session_token)

        return {
            "score": score,
            "total": total,
            "percentage": percentage,
            "grade": grade,
            "correctCount": correct,
            "wrongCount": wrong,
            "skippedCount": skipped,
            "mode": "quiz",
        }
