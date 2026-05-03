import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(500), nullable=False)
    resource_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_id}>"
