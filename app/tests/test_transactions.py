import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint returns ok status."""
    response = await client.get("/api/v1/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
    assert "timestamp" in data
    assert "database" in data
    assert "redis" in data


@pytest.mark.asyncio
async def test_create_transaction(client: AsyncClient, sample_transaction_data):
    """Test creating a new transaction."""
    response = await client.post(
        "/api/v1/transactions",
        json=sample_transaction_data
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == sample_transaction_data["amount"]
    assert data["currency"] == sample_transaction_data["currency"]
    assert data["merchant"] == sample_transaction_data["merchant"]
    assert "id" in data
    assert "date" in data


@pytest.mark.asyncio
async def test_get_transactions(client: AsyncClient, sample_transaction_data):
    """Test retrieving list of transactions."""
    # Create a transaction first
    await client.post("/api/v1/transactions", json=sample_transaction_data)
    
    # Get all transactions
    response = await client.get("/api/v1/transactions")
    
    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert "total" in data
    assert len(data["transactions"]) > 0


@pytest.mark.asyncio
async def test_get_transaction_by_id(client: AsyncClient, sample_transaction_data):
    """Test retrieving a specific transaction by ID."""
    # Create a transaction
    create_response = await client.post(
        "/api/v1/transactions",
        json=sample_transaction_data
    )
    transaction_id = create_response.json()["id"]
    
    # Get the transaction by ID
    response = await client.get(f"/api/v1/transactions/{transaction_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == transaction_id
    assert data["amount"] == sample_transaction_data["amount"]


@pytest.mark.asyncio
async def test_get_nonexistent_transaction(client: AsyncClient):
    """Test retrieving a non-existent transaction returns 404."""
    response = await client.get("/api/v1/transactions/99999")
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_transaction(client: AsyncClient, sample_transaction_data):
    """Test deleting a transaction."""
    # Create a transaction
    create_response = await client.post(
        "/api/v1/transactions",
        json=sample_transaction_data
    )
    transaction_id = create_response.json()["id"]
    
    # Delete the transaction
    response = await client.delete(f"/api/v1/transactions/{transaction_id}")
    
    assert response.status_code == 204
    
    # Verify it's deleted
    get_response = await client.get(f"/api/v1/transactions/{transaction_id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_create_transaction_invalid_data(client: AsyncClient):
    """Test creating transaction with invalid data returns 422."""
    invalid_data = {
        "amount": "not_a_number",  # Invalid type
        "currency": "USD"
    }
    
    response = await client.post("/api/v1/transactions", json=invalid_data)
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_transactions_pagination(client: AsyncClient, sample_transaction_data):
    """Test transaction pagination."""
    # Create multiple transactions
    for i in range(5):
        await client.post("/api/v1/transactions", json=sample_transaction_data)
    
    # Test pagination
    response = await client.get("/api/v1/transactions?skip=0&limit=2")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["transactions"]) == 2
