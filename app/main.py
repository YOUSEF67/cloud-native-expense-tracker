from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog
import time
import uuid
import asyncio

from app.config import settings
from app.routers import transactions
from app.database import engine, Base

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0"
)

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
