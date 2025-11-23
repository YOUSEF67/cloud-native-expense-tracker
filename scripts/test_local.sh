#!/bin/bash
set -e

echo "Waiting for services to be ready..."
sleep 10

echo "Running migrations..."
docker-compose exec -T app python -m alembic upgrade head

echo "Testing Health Endpoint..."
curl -s http://localhost:8080/api/v1/health | jq .

echo "Creating Transaction..."
curl -s -X POST http://localhost:8080/api/v1/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.50, "currency": "USD", "merchant": "Local Test", "description": "Testing locally"}' | jq .

echo "Listing Transactions..."
curl -s http://localhost:8080/api/v1/transactions | jq .

echo "Test Complete!"
