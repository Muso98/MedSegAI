from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.study import FileFormat, StudyStatus
from app.models.result import ValidationStatus
import uuid


# ─── Study ───────────────────────────────────────────────────────────────────

class StudyResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    title: Optional[str] = None
    modality: str
    body_part: str
    original_filename: str
    file_format: FileFormat
    file_size_bytes: Optional[int] = None
    status: StudyStatus
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    uploaded_by: Optional[uuid.UUID] = None
    study_date: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyStatusResponse(BaseModel):
    id: uuid.UUID
    status: StudyStatus
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    result_id: Optional[uuid.UUID] = None


# ─── Result ──────────────────────────────────────────────────────────────────

class SegmentationResultResponse(BaseModel):
    id: uuid.UUID
    study_id: uuid.UUID
    model_name: str
    model_version: Optional[str] = None
    tumor_present: bool
    tumor_area_pixels: Optional[int] = None
    tumor_area_percent: Optional[float] = None
    tumor_volume_cm3: Optional[float] = None
    dice_score: Optional[float] = None
    iou_score: Optional[float] = None
    confidence_score: Optional[float] = None
    processing_time_sec: Optional[float] = None
    validation_status: ValidationStatus
    validated_by: Optional[uuid.UUID] = None
    validation_notes: Optional[str] = None
    validated_at: Optional[datetime] = None
    overlay_image_url: Optional[str] = None
    mask_image_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ValidationRequest(BaseModel):
    status: ValidationStatus
    notes: Optional[str] = None


# ─── Admin ───────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_patients: int
    total_studies: int
    studies_today: int
    studies_processing: int
    studies_completed: int
    studies_failed: int
    total_users: int


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_email: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    ip_address: Optional[str] = None
    status_code: Optional[int] = None
    processing_time_ms: Optional[int] = None
    timestamp: datetime

    model_config = {"from_attributes": True}
