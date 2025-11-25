from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Index
from sqlalchemy.sql import func, text
from app.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="USD")
    description = Column(Text)
    merchant = Column(String(255), nullable=False, index=True)  # Add index for merchant searches
    date = Column(DateTime(timezone=True), server_default=text("now()"), index=True)  # Add index for date queries
    created_at = Column(DateTime(timezone=True), server_default=text("now()"), index=True)  # Add index for sorting
    updated_at = Column(DateTime(timezone=True), onupdate=text("now()"))
    
    # Add composite index for common query patterns
    __table_args__ = (
        Index('idx_merchant_date', 'merchant', 'date'),  # For merchant + date queries
        Index('idx_date_amount', 'date', 'amount'),  # For date range + amount queries
    )
