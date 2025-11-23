import redis.asyncio as redis
from app.config import settings
import json
from typing import Optional, Any
import structlog

logger = structlog.get_logger()

class Cache:
    def __init__(self):
        self.redis = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def get(self, key: str) -> Optional[Any]:
        try:
            data = await self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error("redis_get_error", error=str(e))
            return None

    async def set(self, key: str, value: Any, ttl: int = 300):
        try:
            await self.redis.set(key, json.dumps(value), ex=ttl)
        except Exception as e:
            logger.error("redis_set_error", error=str(e))

    async def delete(self, key: str):
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.error("redis_delete_error", error=str(e))

    async def ping(self) -> bool:
        try:
            return await self.redis.ping()
        except Exception:
            return False

cache = Cache()

async def get_redis():
    return cache
