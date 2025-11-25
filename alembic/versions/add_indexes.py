"""Add database indexes

Revision ID: 2b3c4d5e6f7g
Revises: 1a2b3c4d5e6f
Create Date: 2025-11-25 23:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b3c4d5e6f7g'
down_revision: Union[str, None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add indexes to existing columns
    op.create_index('ix_transactions_merchant', 'transactions', ['merchant'], unique=False)
    op.create_index('ix_transactions_date', 'transactions', ['date'], unique=False)
    op.create_index('ix_transactions_created_at', 'transactions', ['created_at'], unique=False)
    
    # Add composite indexes
    op.create_index('idx_merchant_date', 'transactions', ['merchant', 'date'], unique=False)
    op.create_index('idx_date_amount', 'transactions', ['date', 'amount'], unique=False)


def downgrade() -> None:
    # Remove composite indexes
    op.drop_index('idx_date_amount', table_name='transactions')
    op.drop_index('idx_merchant_date', table_name='transactions')
    
    # Remove column indexes
    op.drop_index('ix_transactions_created_at', table_name='transactions')
    op.drop_index('ix_transactions_date', table_name='transactions')
    op.drop_index('ix_transactions_merchant', table_name='transactions')
