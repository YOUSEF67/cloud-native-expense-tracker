from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import structlog
import time
import uuid
import asyncio

from app.config import settings
from app.routers import transactions
from app.database import engine, Base

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Expense Tracker API",
    description="""Production-ready expense tracking application with cloud-native architecture.
    
    ## Features
    
    * **Transaction Management**: Create, read, update, and delete expense transactions
    * **Health Monitoring**: Comprehensive health checks for database and cache
    * **High Performance**: Redis caching for sub-100ms response times
    * **Observability**: Prometheus metrics and structured logging
    
    ## Authentication
    
    Currently in development. Future versions will include JWT-based authentication.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "health",
            "description": "Health check operations for monitoring service status"
        },
        {
            "name": "transactions",
            "description": "Operations for managing financial transactions"
        }
    ],
    contact={
        "name": "API Support",
        "email": "support@expense-tracker.com"
    },
    license_info={
        "name": "MIT",
    }
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Logging configuration
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.time()
    
    log = logger.bind(request_id=request_id, method=request.method, path=request.url.path)
    log.info("request_started")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    log.info(
        "request_completed",
        status_code=response.status_code,
        duration=process_time
    )
    response.headers["X-Request-ID"] = request_id
    return response

# Routes
app.include_router(transactions.router, prefix="/api/v1", tags=["transactions"])

# Metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

from sqlalchemy import text

@app.on_event("startup")
async def startup():
    retries = 5
    wait_time = 2
    for i in range(retries):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("database_connected")
            break
        except Exception as e:
            if i == retries - 1:
                logger.error("database_connection_failed", error=str(e))
                raise e
            logger.warning("database_connection_retry", attempt=i+1, error=str(e))
            await asyncio.sleep(wait_time)
            wait_time *= 2

@app.get("/")
async def root():
    return {"message": "Welcome to Expense Tracker API"}
