from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, validator
from typing import List, Optional
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "MedSegAI"
    APP_ENV: str = "production"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(32)
    API_V1_PREFIX: str = "/api/v1"
    ALLOWED_HOSTS: str = "localhost"

    # Database
    DATABASE_URL: str
    POSTGRES_USER: str = "medsegai"
    POSTGRES_PASSWORD: str = "medsegai_secret"
    POSTGRES_DB: str = "medsegai"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File Storage
    MEDIA_ROOT: str = "/app/media"
    MAX_UPLOAD_SIZE_MB: int = 500

    # AI Model
    AI_MODEL_PATH: str = "/app/ai_models/unet_weights.pth"
    AI_MODEL_TYPE: str = "attention_unet"
    AI_INPUT_SIZE: int = 256
    AI_DEVICE: str = "auto"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "noreply@medsegai.com"

    # First Admin
    FIRST_ADMIN_EMAIL: str = "admin@medsegai.com"
    FIRST_ADMIN_PASSWORD: str = "Admin123!@#"
    FIRST_ADMIN_FULLNAME: str = "System Administrator"

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [h.strip() for h in self.ALLOWED_HOSTS.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
