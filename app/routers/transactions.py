from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from datetime import datetime
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database import get_db
from app.models import Transaction
from app.schemas import TransactionCreate, TransactionResponse, TransactionList, HealthResponse
from app.cache import get_redis, Cache
import structlog

router = APIRouter()
logger = structlog.get_logger()
limiter = Limiter(key_func=get_remote_address)

@router.get("/health", response_model=HealthResponse, tags=["health"])
@limiter.limit("30/minute")
async def health_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
    cache: Cache = Depends(get_redis)
):
    """
    Check the health status of the API and its dependencies.
    
    Returns the status of:
    - API service
    - Database connection
    - Redis cache connection
    
    Rate limit: 30 requests per minute
    """
    db_status = "up"
    try:
        await db.execute(select(1))
    except Exception:
        db_status = "down"

    redis_status = "up" if await cache.ping() else "down"

    return HealthResponse(
        status="ok" if db_status == "up" and redis_status == "up" else "degraded",
        timestamp=datetime.now(),
        database=db_status,
        redis=redis_status
    )

@router.get("/transactions", response_model=TransactionList)
async def get_transactions(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    cache: Cache = Depends(get_redis)
):
    cache_key = f"transactions:all:{skip}:{limit}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        return TransactionList(**cached_data)

    query = select(Transaction).offset(skip).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    response = TransactionList(
        transactions=[TransactionResponse.model_validate(t) for t in transactions],
        total=len(transactions)
    )
    
    await cache.set(cache_key, response.model_dump(mode='json'), ttl=60)
    return response

@router.post("/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    cache: Cache = Depends(get_redis)
):
    db_transaction = Transaction(**transaction.model_dump())
    db.add(db_transaction)
    await db.commit()
    await db.refresh(db_transaction)
    
    # Invalidate cache
    await cache.delete("transactions:all:*")
    
    return db_transaction

@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    cache: Cache = Depends(get_redis)
):
    cache_key = f"transaction:{transaction_id}"
    cached_data = await cache.get(cache_key)
    if cached_data:
        return TransactionResponse(**cached_data)

    query = select(Transaction).where(Transaction.id == transaction_id)
    result = await db.execute(query)
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    response = TransactionResponse.model_validate(transaction)
    await cache.set(cache_key, response.model_dump(mode='json'), ttl=300)
    return response

@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    cache: Cache = Depends(get_redis)
):
    query = select(Transaction).where(Transaction.id == transaction_id)
    result = await db.execute(query)
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.delete(transaction)
    await db.commit()
    
    await cache.delete(f"transaction:{transaction_id}")
    await cache.delete("transactions:all:*")
