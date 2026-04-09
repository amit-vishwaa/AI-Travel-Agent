"""
Central Gemini + Ollama router with timeout handling and caching.
"""
from __future__ import annotations

import asyncio
import json
import re
from typing import Callable
from typing import Any

import httpx

from app.config.settings import settings
from app.services.cache import cache

try:
    from google import genai  # type: ignore[import]
except ImportError:  # pragma: no cover
    genai = None

_gemini_client = None

TASK_ROUTING = {
    "trip_planning": ["gemini", "ollama"],
    "budget": ["gemini", "ollama"],
    "structured": ["gemini", "ollama"],
    "chat": ["ollama", "gemini"],
}


def _clean_json(text: str) -> str:
    cleaned = re.sub(r"```json\s*", "", text or "", flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    return cleaned.strip()


def _extract_json(text: str) -> Any:
    cleaned = _clean_json(text)
    if not cleaned:
        raise ValueError("Empty AI response")
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        obj_match = re.search(r"\{[\s\S]*\}", cleaned)
        arr_match = re.search(r"\[[\s\S]*\]", cleaned)
        payload = None
        if obj_match and arr_match:
            payload = obj_match.group(0) if obj_match.start() < arr_match.start() else arr_match.group(0)
        elif obj_match:
            payload = obj_match.group(0)
        elif arr_match:
            payload = arr_match.group(0)
        if not payload:
            raise
        return json.loads(payload)


def _gemini_model(model_override: str | None = None) -> str:
    model = model_override or settings.GEMINI_MODEL or "models/gemini-2.0-flash-lite-001"
    return model if model.startswith("models/") else f"models/{model}"


def _ollama_model(model_override: str | None = None) -> str:
    return model_override or settings.OLLAMA_MODEL


def _get_gemini_client():
    global _gemini_client
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    if genai is None:
        raise RuntimeError("google-genai is not installed")
    if _gemini_client is None:
        _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client


def _gemini_text(response: Any) -> str:
    text = getattr(response, "text", None)
    if text:
        return text
    for candidate in getattr(response, "candidates", None) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            part_text = getattr(part, "text", None)
            if part_text:
                return part_text
    return ""


async def _call_gemini(prompt: str, model_override: str | None = None) -> str:
    client = _get_gemini_client()

    def _run() -> str:
        response = client.models.generate_content(model=_gemini_model(model_override), contents=prompt)
        text = _gemini_text(response)
        if not text:
            raise RuntimeError("Gemini returned an empty response")
        return text

    return await asyncio.to_thread(_run)


async def _call_ollama(prompt: str, model_override: str | None = None) -> str:
    async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={
                "model": _ollama_model(model_override),
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")


def _provider_label(provider: str, model_override: str | None = None) -> str:
    if provider == "gemini":
        return f"gemini ({_gemini_model(model_override)})"
    if provider == "ollama":
        return f"ollama ({_ollama_model(model_override)})"
    return provider


async def _provider_call(provider: str, prompt: str, model_override: str | None = None) -> str:
    if provider == "gemini":
        return await _call_gemini(prompt, model_override)
    if provider == "ollama":
        return await _call_ollama(prompt, model_override)
    raise RuntimeError(f"Unknown provider '{provider}'")


async def generate(
    *,
    task: str,
    prompt: str,
    expect_json: bool = True,
    cache_key: str | None = None,
    validator: Callable[[Any], None] | None = None,
    preferred_provider: str | None = None,
    preferred_model: str | None = None,
) -> dict[str, Any]:
    if task not in TASK_ROUTING:
        raise RuntimeError(f"Unsupported AI task '{task}'")

    if cache_key:
        cached = await cache.get(cache_key)
        if cached is not None:
            try:
                if validator is not None:
                    validator(cached.get("payload"))
                return {**cached, "cached": True}
            except Exception:
                pass

    allowed_providers = TASK_ROUTING[task]
    selected_provider = (preferred_provider or "").strip().lower()
    if selected_provider in allowed_providers:
        providers = [selected_provider, *[provider for provider in allowed_providers if provider != selected_provider]]
    else:
        providers = allowed_providers

    errors: list[dict[str, str]] = []
    for provider in providers:
        try:
            model_override = preferred_model if provider == selected_provider else None
            raw = await asyncio.wait_for(
                _provider_call(provider, prompt, model_override),
                timeout=settings.AI_TIMEOUT_SECONDS,
            )
            payload = _extract_json(raw) if expect_json else raw.strip()
            if validator is not None:
                validator(payload)
            result = {
                "provider": _provider_label(provider, model_override),
                "provider_name": provider,
                "model": _gemini_model(model_override) if provider == "gemini" else _ollama_model(model_override),
                "payload": payload,
                "cached": False,
            }
            if cache_key:
                await cache.set(cache_key, result)
            return result
        except Exception as exc:
            errors.append({"provider": _provider_label(provider, model_override), "error": str(exc)})

    raise RuntimeError(f"All AI providers failed for task '{task}': {errors}")
