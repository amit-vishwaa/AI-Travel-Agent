"""
Small in-memory TTL cache for repeated upstream queries.
"""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from app.config.settings import settings


class TTLCache:
    def __init__(self, ttl_seconds: int = 900):
        self.ttl_seconds = ttl_seconds
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def make_key(prefix: str, payload: Any) -> str:
        return f"{prefix}:{json.dumps(payload, sort_keys=True, default=str)}"

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if expires_at <= time.time():
                self._data.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> Any:
        async with self._lock:
            ttl = ttl_seconds if ttl_seconds is not None else self.ttl_seconds
            self._data[key] = (time.time() + ttl, value)
        return value


cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
