from __future__ import annotations

import json
from hashlib import sha256
from random import Random
from typing import Any, Dict, List, Tuple

import httpx

from utils.logger import logger
from utils.text import strip_code_fences


class NimQuizClient:
    def __init__(self, api_key: str, model: str, api_url: str) -> None:
        self.api_key = (api_key or "").strip()
        self.model = (model or "mistral-large-3-675b-instruct-2512").strip()
        self.api_url = (api_url or "https://integrate.api.nvidia.com/v1/chat/completions").strip()

    def is_demo_mode(self) -> bool:
        return (not self.api_key) or self.api_key.upper() == "ABC123"

    def _build_prompt(self, payload: Dict[str, Any], count: int, question_types: List[str]) -> str:
        types_text = ", ".join(question_types)
        return f"""
Generate EXACTLY {count} quiz questions as valid JSON only.

Rules:
- Single-player educational quiz
- No markdown
- No explanations outside JSON
- No duplicate questions
- One mark per question
- Supported types: {types_text}
- Education level: {payload.get('level')}
- Topic: {payload.get('topic')}
- Subject: {payload.get('subject') or payload.get('topic')}
- Difficulty: {payload.get('difficulty')}
- Branch: {payload.get('branch') or ''}
- Semester: {payload.get('semester') or ''}
- Return an object with a questions array.
- Each question must include: id, type, question, options, answer, explanation.
- MCQ must have 4 believable options.
- True/False must have 2 options: True and False.
- Fill blanks must have options as an empty array.
- Questions must be realistic, non-obvious, and level-accurate.

JSON schema:
{{
  "questions": [
    {{
      "id": "unique_string",
      "type": "mcq|true_false|fill_blank",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "answer": "Correct answer",
      "explanation": "Short explanation"
    }}
  ]
}}
""".strip()

    def _demo_generate(self, payload: Dict[str, Any], count: int, question_types: List[str]) -> List[Dict[str, Any]]:
        seed_text = json.dumps({
            "topic": payload.get("topic", ""),
            "level": payload.get("level", ""),
            "difficulty": payload.get("difficulty", ""),
            "types": question_types,
            "count": count,
        }, sort_keys=True)
        seed = int(sha256(seed_text.encode("utf-8")).hexdigest()[:8], 16)
        rng = Random(seed)
        topic = str(payload.get("topic") or "the topic").strip()
        subject = str(payload.get("subject") or topic).strip()
        level = str(payload.get("level") or "general").strip()
        difficulty = str(payload.get("difficulty") or "medium").strip()

        def make_mcq(idx: int) -> Dict[str, Any]:
            correct = f"Core idea related to {topic}"
            options = [
                correct,
                f"An unrelated concept in {subject}",
                f"A distractor linked to {level}",
                f"A background detail from {difficulty}",
            ]
            rng.shuffle(options)
            return {
                "id": f"demo-mcq-{idx}",
                "type": "mcq",
                "question": f"Which option best matches the main idea of {topic}?",
                "options": options,
                "answer": correct,
                "explanation": f"The main idea is directly tied to {topic}.",
            }

        def make_tf(idx: int) -> Dict[str, Any]:
            truth = idx % 2 == 0
            return {
                "id": f"demo-tf-{idx}",
                "type": "true_false",
                "question": f"{topic} is an important part of {subject} at the {level} level.",
                "options": ["True", "False"],
                "answer": "True" if truth else "False",
                "explanation": f"This statement is {('true' if truth else 'false')} for the generated demo quiz.",
            }

        def make_fill(idx: int) -> Dict[str, Any]:
            ans = topic.split()[0].capitalize()
            return {
                "id": f"demo-fill-{idx}",
                "type": "fill_blank",
                "question": f"Fill in the blank: The concept of _____ is closely connected to {subject}.",
                "options": [],
                "answer": ans,
                "explanation": f"{ans} is used as the sample fill-in answer in demo mode.",
            }

        makers = {"mcq": make_mcq, "true_false": make_tf, "fill_blank": make_fill}
        out = []
        for i in range(count):
            qtype = question_types[i % len(question_types)]
            out.append(makers.get(qtype, make_mcq)(i + 1))
        rng.shuffle(out)
        return out

    async def generate(self, payload: Dict[str, Any], count: int, question_types: List[str]) -> tuple[List[Dict[str, Any]], str]:
        if self.is_demo_mode():
            return self._demo_generate(payload, count, question_types), "demo"

        prompt = self._build_prompt(payload, count, question_types)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        request_body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a strict quiz generator that returns valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.45,
            "top_p": 0.9,
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.api_url, headers=headers, json=request_body)
                response.raise_for_status()
                data = response.json()

            text = ""
            if isinstance(data, dict):
                choices = data.get("choices") or []
                if choices and isinstance(choices, list):
                    message = choices[0].get("message") or {}
                    text = message.get("content") or ""
                elif data.get("content"):
                    text = str(data["content"])

            text = strip_code_fences(text)
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                text = text[start:end + 1]

            parsed = json.loads(text)
            questions = parsed.get("questions") if isinstance(parsed, dict) else None
            if not isinstance(questions, list):
                raise ValueError("AI response missing questions array")

            cleaned: List[Dict[str, Any]] = []
            for index, item in enumerate(questions, start=1):
                if not isinstance(item, dict):
                    continue
                qid = str(item.get("id") or f"ai-{index}").strip()
                qtype = str(item.get("type") or "mcq").strip()
                question = str(item.get("question") or "").strip()
                options = item.get("options") or []
                if qtype == "fill_blank":
                    options = []
                if qtype in {"mcq", "true_false"} and not isinstance(options, list):
                    options = []
                answer = item.get("answer")
                explanation = str(item.get("explanation") or "").strip()
                if question and answer is not None:
                    cleaned.append({
                        "id": qid,
                        "type": qtype,
                        "question": question,
                        "options": [str(opt) for opt in options][:4],
                        "answer": answer,
                        "explanation": explanation,
                    })

            if not cleaned:
                raise ValueError("AI output could not be cleaned")
            return cleaned[:count], "nim"
        except Exception as exc:
            logger.warning("AI generation failed, using demo fallback: %s", exc)
            return self._demo_generate(payload, count, question_types), "demo"
