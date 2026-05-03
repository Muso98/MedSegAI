import sys
import time
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


def setup_logging():
    logger.remove()
    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="INFO",
        colorize=True,
    )
    logger.add(
        "/app/logs/medsegai.log",
        rotation="100 MB",
        retention="30 days",
        compression="gz",
        level="WARNING",
        serialize=False,
    )


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Logs every API request with user info to the database."""

    SKIP_PATHS = {"/api/v1/auth/refresh", "/api/v1/health", "/docs", "/openapi.json"}

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        if request.url.path in self.SKIP_PATHS:
            return response

        # Log to stdout
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"time={process_time:.3f}s "
            f"ip={request.client.host if request.client else 'unknown'}"
        )

        # Async DB audit log (fire-and-forget)
        if request.url.path.startswith("/api/") and request.method in {"POST", "PUT", "DELETE", "PATCH"}:
            import asyncio
            asyncio.create_task(
                self._write_audit_log(request, response, process_time)
            )

        return response

    async def _write_audit_log(self, request: Request, response: Response, process_time: float):
        try:
            from app.core.database import AsyncSessionLocal
            from app.models.audit_log import AuditLog
            import uuid

            # Try to get user from token
            user_id = None
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                from app.core.security import decode_token
                payload = decode_token(auth_header[7:])
                if payload:
                    user_id = payload.get("sub")

            async with AsyncSessionLocal() as session:
                log_entry = AuditLog(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    action=f"{request.method} {request.url.path}",
                    resource_type=request.url.path.split("/")[3] if len(request.url.path.split("/")) > 3 else "unknown",
                    ip_address=request.client.host if request.client else "unknown",
                    status_code=response.status_code,
                    processing_time_ms=int(process_time * 1000),
                )
                session.add(log_entry)
                await session.commit()
        except Exception as e:
            logger.warning(f"Audit log write failed: {e}")
