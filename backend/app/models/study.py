import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, BigInteger
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class FileFormat(str, enum.Enum):
    PNG = "png"
    JPG = "jpg"
    NIFTI = "nifti"


class StudyStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PREPROCESSING = "preprocessing"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MRIStudy(Base):
    __tablename__ = "mri_studies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    modality: Mapped[str] = mapped_column(String(50), default="MRI")
    body_part: Mapped[str] = mapped_column(String(100), default="Brain")
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_format: Mapped[FileFormat] = mapped_column(SAEnum(FileFormat), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[StudyStatus] = mapped_column(SAEnum(StudyStatus), default=StudyStatus.UPLOADED)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    study_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<MRIStudy {self.id} [{self.status}]>"
