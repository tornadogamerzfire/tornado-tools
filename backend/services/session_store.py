from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from uuid import uuid4


@dataclass
class QuizSession:
    session_token: str
    quiz_id: str
    payload: Dict[str, Any]
    answer_key: Dict[str, Any]
    expires_at: float
    created_at: float = field(default_factory=lambda: time.time())


class QuizSessionStore:
    def __init__(self, ttl_seconds: int = 7200) -> None:
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._sessions: Dict[str, QuizSession] = {}

    def create(
        self,
        quiz_id: str,
        payload: Dict[str, Any],
        answer_key: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
    ) -> QuizSession:
        token = uuid4().hex
        ttl = int(ttl_seconds or self.ttl_seconds)
        session = QuizSession(
            session_token=token,
            quiz_id=quiz_id,
            payload=payload,
            answer_key=answer_key,
            expires_at=time.time() + ttl,
        )
        with self._lock:
            self._sessions[token] = session
        return session

    def get(self, session_token: str) -> Optional[QuizSession]:
        self.purge_expired()
        with self._lock:
            return self._sessions.get(session_token)

    def delete(self, session_token: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_token, None) is not None

    def purge_expired(self) -> int:
        now = time.time()
        removed = 0
        with self._lock:
            expired = [token for token, session in self._sessions.items() if session.expires_at <= now]
            for token in expired:
                self._sessions.pop(token, None)
                removed += 1
        return removed

    def size(self) -> int:
        self.purge_expired()
        with self._lock:
            return len(self._sessions)
