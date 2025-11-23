from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

class TransactionBase(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field("USD", min_length=3, max_length=3)
    description: Optional[str] = None
    merchant: str = Field(..., min_length=1)

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    date: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TransactionList(BaseModel):
    transactions: List[TransactionResponse]
    total: int

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    database: str
    redis: str
