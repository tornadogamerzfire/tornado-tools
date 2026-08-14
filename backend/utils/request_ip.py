from __future__ import annotations

from fastapi import Request


def client_ip(request: Request) -> str:
    """Best-effort client IP for rate limiting (trusts X-Forwarded-For from the PaaS edge)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
