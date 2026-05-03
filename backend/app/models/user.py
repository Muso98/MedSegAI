import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    RADIOLOGIST = "RADIOLOGIST"
    OPERATOR = "OPERATOR"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.DOCTOR)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<User {self.email} [{self.role}]>"
