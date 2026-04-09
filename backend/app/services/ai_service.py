"""
Itinerary-focused AI service with Gemini-first and Ollama fallback behavior.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.config.settings import settings

GEMINI_MODELS = (
    ("gemini-2.0-flash", "Gemini 2.0 Flash"),
    ("gemini-1.5-flash", "Gemini 1.5 Flash"),
    ("gemini-1.5-pro", "Gemini 1.5 Pro"),
)

OLLAMA_MODELS = (
    ("qwen2.5-coder:7b", "Ollama qwen2.5-coder:7b"),
    ("llama3.2", "Ollama llama3.2"),
    ("llama3.1", "Ollama llama3.1"),
    ("mistral", "Ollama mistral"),
    ("qwen2.5", "Ollama qwen2.5"),
)

GEMINI_TIMEOUT_SECONDS = 30
OLLAMA_TIMEOUT_SECONDS = 120


def get_model_name() -> str:
    return "gemini-fallback-ollama"


def _ollama_base_url() -> str:
    return (settings.OLLAMA_URL or settings.OLLAMA_BASE_URL or "http://localhost:11434").rstrip("/")


def _gemini_candidates(preferred_model: str | None = None) -> tuple[tuple[str, str], ...]:
    if preferred_model:
        return ((preferred_model, f"Gemini {preferred_model}"),)
    return GEMINI_MODELS


def _ollama_candidates(preferred_model: str | None = None) -> tuple[tuple[str, str], ...]:
    if preferred_model:
        return ((preferred_model, f"Ollama {preferred_model}"),)
    return OLLAMA_MODELS


def _gemini_text(payload: dict[str, Any]) -> str:
    for candidate in payload.get("candidates") or []:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = str(part.get("text") or "").strip()
            if text:
                return text
    return ""


async def _call_gemini_model(*, model: str, system_prompt: str, user_prompt: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "system_instruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
    }

    async with httpx.AsyncClient(timeout=GEMINI_TIMEOUT_SECONDS) as client:
        response = await client.post(endpoint, params={"key": settings.GEMINI_API_KEY}, json=payload)
        response.raise_for_status()
        text = _gemini_text(response.json())
        if not text:
            raise RuntimeError(f"{model} returned an empty response")
        return text


async def _call_ollama_model(*, model: str, system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{_ollama_base_url()}/api/generate",
            json={
                "model": model,
                "system": system_prompt,
                "prompt": user_prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        text = str((response.json() or {}).get("response") or "").strip()
        if not text:
            raise RuntimeError(f"{model} returned an empty response")
        return text


async def generateItinerary(params: dict[str, Any]) -> dict[str, str]:
    system_prompt = str(params.get("systemPrompt") or "").strip()
    user_prompt = str(params.get("userPrompt") or "").strip()
    preferred_provider = str(params.get("preferredProvider") or "").strip().lower()
    preferred_model = str(params.get("preferredModel") or "").strip() or None
    if not system_prompt or not user_prompt:
        raise RuntimeError("Itinerary prompts are missing")

    errors: list[str] = []

    providers: list[tuple[str, tuple[tuple[str, str], ...]]] = []
    if preferred_provider == "gemini":
        providers.append(("gemini", _gemini_candidates(preferred_model)))
    elif preferred_provider == "ollama":
        providers.append(("ollama", _ollama_candidates(preferred_model)))
    else:
        providers.append(("gemini", _gemini_candidates()))
        providers.append(("ollama", _ollama_candidates()))

    for provider, candidates in providers:
        for model, provider_label in candidates:
            try:
                if provider == "gemini":
                    result = await _call_gemini_model(model=model, system_prompt=system_prompt, user_prompt=user_prompt)
                else:
                    result = await _call_ollama_model(model=model, system_prompt=system_prompt, user_prompt=user_prompt)
                return {"result": result, "provider": provider_label, "model": model, "provider_name": provider}
            except Exception as exc:
                errors.append(f"{provider_label}: {exc}")

    if preferred_provider == "gemini":
        raise RuntimeError(f"Gemini itinerary provider failed: {errors}")
    if preferred_provider == "ollama":
        raise RuntimeError(f"Ollama itinerary provider failed: {errors}")
    raise RuntimeError(f"Both Gemini and Ollama itinerary providers failed: {errors}")


generate_itinerary = generateItinerary
