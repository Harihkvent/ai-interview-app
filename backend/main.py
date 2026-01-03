from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from contextlib import asynccontextmanager
import time
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("api")

# Add exception logger for validation errors
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_details = exc.errors()
    logger.error(f"❌ Validation Error: {error_details}")
    try:
        body = await request.json()
        logger.error(f"Request Body: {body}")
    except:
        logger.error("Could not read request body")
        
    return JSONResponse(
        status_code=422,
        content={"detail": error_details, "body": str(exc.body)},
    )

from database import init_db
from routes import router
from auth_routes import router as auth_router
from user_routes import router as user_router
from metrics import http_requests, http_request_duration
from ml_job_matcher import warmup_models
from cache_service import cache_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    await init_db()
    print("✅ Database initialized")
    
    # Seed Question Bank if needed
    from init_question_bank import seed_questions
    try:
        await seed_questions()
    except Exception as e:
        logger.error(f"Failed to seed question bank: {e}")
    
    # Warm up ML models in background
    print("🔥 Warming up ML models...")
    warmup_models()
    
    # Connect to Redis
    await cache_manager.connect()
    
    print("📊 Prometheus metrics available at /metrics")
    logger.info("🚀 API Started and ready to handle requests")
    yield
    # Shutdown
    await cache_manager.disconnect()
    print("👋 Shutting down...")

app = FastAPI(
    title="AI Interview API",
    description="AI-powered interview system with Krutrim integration",
    version="1.0.0",

    lifespan=lifespan
)

# Register validation exception handler
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to track HTTP request metrics
@app.middleware("http")
async def track_requests(request, call_next):
    """Track HTTP request metrics"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    method = request.method
    endpoint = request.url.path
    status_code = response.status_code
    
    http_requests.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
    http_request_duration.labels(method=method, endpoint=endpoint).observe(duration)
    
    logger.info(f"{method} {endpoint} - {status_code} ({duration:.2f}s)")
    
    return response

# Include API routes
app.include_router(auth_router)  # Authentication routes
app.include_router(user_router)  # User dashboard and management
from profile_routes import router as profile_router
app.include_router(profile_router) # New Profile & Resume Management
app.include_router(router)  # Main application routes
from interview_router import router as interview_router
app.include_router(interview_router) # New modular interview routes
from agent_routes import router as agent_router
app.include_router(agent_router, prefix="/api/v1/agent", tags=["Agents"])

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {
        "message": "AI Interview API",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "metrics": "/metrics"
        }
    }
