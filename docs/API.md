# API Documentation

The Expense Tracker API provides endpoints for managing financial transactions.

## Base URL

**Production**: `https://api.expense-tracker.com/api/v1`  
**Local Development**: `http://localhost:8080/api/v1`

## Endpoints

### Health Check
Check the health status of the service and its dependencies.

- **URL**: `/health`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T12:00:00Z",
    "database": "up",
    "redis": "up"
  }
  ```

### List Transactions
Retrieve a paginated list of transactions.

- **URL**: `/transactions`
- **Method**: `GET`
- **Query Params**:
  - `skip` (int, default=0): Number of records to skip.
  - `limit` (int, default=100): Max records to return.
- **Response**:
  ```json
  {
    "transactions": [
      {
        "id": 1,
        "amount": 50.0,
        "currency": "USD",
        "merchant": "Amazon",
        "date": "2024-01-01T10:00:00Z"
      }
    ],
    "total": 1
  }
  ```

### Create Transaction
Create a new transaction record.

- **URL**: `/transactions`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "amount": 50.0,
    "currency": "USD",
    "merchant": "Amazon",
    "description": "Office supplies"
  }
  ```
- **Response**: `201 Created`

### Get Transaction
Retrieve a specific transaction by ID.

- **URL**: `/transactions/{id}`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "id": 1,
    "amount": 50.0,
    "currency": "USD",
    "merchant": "Amazon",
    "date": "2024-01-01T10:00:00Z"
  }
  ```

### Delete Transaction
Delete a specific transaction.

- **URL**: `/transactions/{id}`
- **Method**: `DELETE`
- **Response**: `204 No Content`
