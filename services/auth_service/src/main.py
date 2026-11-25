from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.database import engine, Base, AsyncSessionLocal
from src.seed import seed_data
from src.api.v1 import (
    auth as auth_router,
    users as users_router,
    roles as roles_router,
    privileges as privileges_router,
    audit as audit_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed default roles/privileges/admin
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with AsyncSessionLocal() as session:
            await seed_data(session)
    except Exception as e:
        print(f"[Startup Warning] Could not automatically initialize or seed database: {e}")

    yield

    # Shutdown: dispose database pool
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="MES IAM Microservice with Granular RBAC, JWT Authentication, and Google OAuth.",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth_router.router, prefix=settings.API_V1_STR)
app.include_router(users_router.router, prefix=settings.API_V1_STR)
app.include_router(roles_router.router, prefix=settings.API_V1_STR)
app.include_router(privileges_router.router, prefix=settings.API_V1_STR)
app.include_router(audit_router.router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
async def health_check():
    """Service health status check."""
    return {
        "status": "healthy",
        "service": "auth_service",
        "environment": settings.ENVIRONMENT
    }


@app.get("/", tags=["Root"])
async def root():
    """Service welcome route with links to docs."""
    return {
        "message": "Welcome to MES IAM & Auth Microservice",
        "docs": "/docs",
        "health": "/health"
    }
