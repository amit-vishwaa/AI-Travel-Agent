"""
Helpers for reading per-request AI provider preferences from request headers.
"""
from __future__ import annotations

from typing import Any

from fastapi import Request

from app.config.settings import settings

ALLOWED_AI_PROVIDERS = {"gemini", "ollama"}


def get_ai_preferences(request: Request) -> dict[str, Any]:
    provider = (request.headers.get("X-AI-Provider") or "").strip().lower()
    model = (request.headers.get("X-AI-Model") or "").strip()

    if provider not in ALLOWED_AI_PROVIDERS:
        provider = ""

    if provider == "ollama" and not model:
        model = settings.OLLAMA_MODEL
    elif provider == "gemini" and not model:
        model = settings.GEMINI_MODEL

    return {
        "provider": provider or None,
        "model": model or None,
    }
