"""
Small in-memory TTL cache for repeated upstream queries.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from typing import Any

from app.config.settings import settings


class TTLCache:
    def __init__(self, ttl_seconds: int = 900, max_entries: int = 512):
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def make_key(prefix: str, payload: Any) -> str:
        serialized = json.dumps(payload, sort_keys=True, default=str, separators=(",", ":"))
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"

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
            now = time.time()
            expired = [key for key, (expires_at, _) in self._data.items() if expires_at <= now]
            for key in expired:
                self._data.pop(key, None)

            if key not in self._data and len(self._data) >= self.max_entries:
                oldest_key = min(self._data, key=lambda item: self._data[item][0])
                self._data.pop(oldest_key, None)

            self._data[key] = (now + ttl, value)
        return value


cache = TTLCache(ttl_seconds=settings.CACHE_TTL_SECONDS)
