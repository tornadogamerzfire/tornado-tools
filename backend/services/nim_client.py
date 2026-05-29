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
        level = str(payload.get('level') or '').strip()
        subject = str(payload.get('subject') or payload.get('topic') or '').strip()
        topic = str(payload.get('topic') or subject or '').strip()
        branch = str(payload.get('branch') or '').strip()
        semester = str(payload.get('semester') or '').strip()
        difficulty = str(payload.get('difficulty') or 'medium').strip()
        return f"""
You are an expert exam setter and question writer.
Create a premium-quality quiz with EXACTLY {count} questions.

Absolute output rules:
- Return JSON only.
- No markdown, no bullets, no commentary, no code fences.
- Do not wrap the JSON in any extra text.
- Every question must be original, realistic, and syllabus-appropriate.
- Avoid vague, generic, childish, or obviously fake questions.
- Do not repeat stems, options, or patterns.
- Do not generate trick questions.
- Do not generate factual questions with uncertain or controversial answers.
- Prefer conceptual understanding over memorization unless the level clearly requires recall.
- Keep language natural and clean.
- Make every distractor believable.
- Keep the difficulty tightly aligned to the selected level and difficulty.
- One mark per question.
- Do not include negative marking.
- Supported question types for this request: {types_text}

Quiz context:
- Education level: {level}
- Subject: {subject}
- Topic: {topic}
- Branch / Trade: {branch}
- Semester: {semester}
- Difficulty: {difficulty}

Content rules:
- If a subject is narrow, stay inside that subject.
- If a subject is broad, choose the most relevant syllabus-safe subtopic.
- If branch or semester is provided, use it to tune the question difficulty and wording.
- Spread the questions across the topic instead of asking the same idea in different words.
- Aim for a balanced mix of difficulty within the requested band.
- If question types include True/False, keep them non-trivial and not guessable.
- If question types include Fill in the Blanks, the missing term must be the key concept, not a random word.
- If question types include MCQ, provide 4 options and make only one clearly correct.
- For True/False, options must be exactly ["True", "False"].
- For Fill in the Blanks, options must be [].
- Use stable, commonly accepted answers only.
- Do not produce answer keys that depend on formatting quirks.

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
                {
                    "role": "system",
                    "content": (
                        "You are a strict senior exam-content writer. "
                        "Return valid JSON only and prioritize accuracy, clarity, and syllabus fit."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "top_p": 0.85,
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
