import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Enum as SAEnum, ForeignKey, Float, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class ValidationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CORRECTED = "corrected"


class SegmentationResult(Base):
    __tablename__ = "segmentation_results"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    study_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mri_studies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Model info
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # File paths
    mask_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    overlay_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metrics
    tumor_present: Mapped[bool] = mapped_column(Boolean, default=False)
    tumor_area_pixels: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tumor_area_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    tumor_volume_cm3: Mapped[float | None] = mapped_column(Float, nullable=True)
    dice_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    iou_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Processing
    processing_time_sec: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Validation
    validation_status: Mapped[ValidationStatus] = mapped_column(SAEnum(ValidationStatus), default=ValidationStatus.PENDING)
    validated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validation_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Report
    pdf_report_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<SegmentationResult study={self.study_id} tumor={self.tumor_present}>"
