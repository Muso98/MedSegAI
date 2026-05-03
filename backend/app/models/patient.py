import uuid
import enum
from datetime import datetime, date, timezone
from sqlalchemy import String, Date, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(SAEnum(Gender), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_anonymized: Mapped[bool] = mapped_column(default=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Patient {self.patient_id}: {self.full_name}>"
