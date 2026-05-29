from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class QuizBuildRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    topic: str = Field(min_length=2, max_length=120)
    level: str = Field(min_length=2, max_length=32)
    subject: Optional[str] = Field(default="")
    branch: Optional[str] = Field(default="")
    semester: Optional[str] = Field(default="")
    difficulty: str = Field(default="medium")
    question_types: List[str] = Field(default_factory=lambda: ["mcq"], alias="questionTypes")
    count_mode: Literal["manual", "random"] = Field(default="manual", alias="countMode")
    question_count: int = Field(default=10, alias="questionCount", ge=5, le=30)
    random_min: Optional[int] = Field(default=None, alias="randomMin", ge=5, le=30)
    random_max: Optional[int] = Field(default=None, alias="randomMax", ge=5, le=30)
    timer_mode: Literal["no_limit", "manual"] = Field(default="no_limit", alias="timerMode")
    timer_minutes: Optional[int] = Field(default=None, alias="timerMinutes", ge=5, le=60)


class QuizSubmitRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_token: str = Field(alias="sessionToken", min_length=8)
    answers: Dict[str, Any] = Field(default_factory=dict)
    elapsed_seconds: Optional[int] = Field(default=None, alias="elapsedSeconds", ge=0)
