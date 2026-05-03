from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
from app.models.patient import Gender
import uuid


class PatientBase(BaseModel):
    full_name: str
    patient_id: str
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_anonymized: Optional[bool] = None


class PatientResponse(PatientBase):
    id: uuid.UUID
    is_anonymized: bool
    created_at: datetime
    updated_at: datetime
    study_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class PatientListResponse(BaseModel):
    items: list[PatientResponse]
    total: int
    page: int
    page_size: int
    pages: int
