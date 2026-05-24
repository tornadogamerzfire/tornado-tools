from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from fastapi import HTTPException, status

class SimpleRateLimiter:
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits = defaultdict(deque)
        self._lock = Lock()

    def hit(self, key: str):
        now = time.time()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window_seconds:
                q.popleft()
            if len(q) >= self.max_requests:
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                                    detail="Too many requests. Please try again later.")
            q.append(now)

limiter = SimpleRateLimiter()
