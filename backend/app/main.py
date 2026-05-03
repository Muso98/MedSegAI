from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db
from app.core.logging import setup_logging, AuditLogMiddleware
from app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await init_db()
    yield


app = FastAPI(
    title="MedSegAI API",
    description="MRT tasvirlarini segmentlash uchun yopiq tibbiy platforma API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Trusted hosts
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list + ["*"])

# CORS — only allow same origin in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_hosts_list if not settings.DEBUG else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Audit logging middleware
app.add_middleware(AuditLogMiddleware)

# Routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}
