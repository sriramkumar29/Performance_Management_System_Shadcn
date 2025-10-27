"""Simple in-process rate limiter utilities.

This is a lightweight, memory-backed rate limiter suitable for single-process
deployments or as a defensive measure. For production-scale deployments use
Redis or a dedicated gateway rate limiter.
"""
from collections import defaultdict, deque
import time
import asyncio
from typing import Deque


class RateLimiter:
    """Allow up to `limit` events per `window_seconds` for a given key.

    Uses a deque of timestamps per key and prunes old entries.
    """

    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._store: defaultdict[str, Deque[float]] = defaultdict(deque)
        self._locks: defaultdict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def allow(self, key: str) -> bool:
        """Return True if an event is allowed for `key`, otherwise False."""
        now = time.time()
        lock = self._locks[key]
        async with lock:
            dq = self._store[key]
            # prune old
            cutoff = now - self.window
            while dq and dq[0] < cutoff:
                dq.popleft()

            if len(dq) < self.limit:
                dq.append(now)
                return True

            return False

    # Synchronous wrapper for places the code doesn't want to await
    def allow_sync(self, key: str) -> bool:
        # Best-effort non-async path — not concurrency-safe in asyncio contexts.
        now = time.time()
        dq = self._store[key]
        cutoff = now - self.window
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) < self.limit:
            dq.append(now)
            return True
        return False
