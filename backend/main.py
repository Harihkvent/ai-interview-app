from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from contextlib import asynccontextmanager
import time

from database import init_db
from routes import router
from auth_routes import router as auth_router
from user_routes import router as user_router
from metrics import http_requests, http_request_duration
from ml_job_matcher import warmup_models

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    await init_db()
    print("✅ Database initialized")
    
    # Warm up ML models in background
    print("🔥 Warming up ML models...")
    warmup_models()
    
    print("📊 Prometheus metrics available at /metrics")
    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="AI Interview API",
    description="AI-powered interview system with Krutrim integration",
    version="1.0.0",
    lifespan=lifespan
)

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
    
    return response

# Include API routes
app.include_router(auth_router)  # Authentication routes
app.include_router(user_router)  # User dashboard and management
app.include_router(router)  # Main application routes

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

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
