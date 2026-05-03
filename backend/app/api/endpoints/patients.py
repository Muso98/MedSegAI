from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
import uuid, math
from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.patient import Patient
from app.models.study import MRIStudy
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse, PatientListResponse

router = APIRouter(prefix="/patients", tags=["Patients"])

ALLOWED_ROLES = ("admin", "doctor", "operator", "radiologist")


@router.get("/", response_model=PatientListResponse)
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*ALLOWED_ROLES)),
):
    query = select(Patient)
    if search:
        query = query.where(
            or_(
                Patient.full_name.ilike(f"%{search}%"),
                Patient.patient_id.ilike(f"%{search}%"),
            )
        )

    total_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_q)).scalar() or 0

    query = query.offset((page - 1) * page_size).limit(page_size).order_by(Patient.created_at.desc())
    result = await db.execute(query)
    patients = result.scalars().all()

    # Attach study counts
    items = []
    for p in patients:
        count_res = await db.execute(select(func.count()).where(MRIStudy.patient_id == p.id))
        study_count = count_res.scalar() or 0
        pr = PatientResponse.model_validate(p)
        pr.study_count = study_count
        items.append(pr)

    return PatientListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "doctor", "operator")),
):
    existing = await db.execute(select(Patient).where(Patient.patient_id == body.patient_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Patient ID already exists")

    patient = Patient(**body.model_dump(), id=uuid.uuid4(), created_by=current_user.id)
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    result = PatientResponse.model_validate(patient)
    result.study_count = 0
    return result


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED_ROLES)),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    count_res = await db.execute(select(func.count()).where(MRIStudy.patient_id == patient_id))
    pr = PatientResponse.model_validate(patient)
    pr.study_count = count_res.scalar() or 0
    return pr


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "operator")),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)
    pr = PatientResponse.model_validate(patient)
    count_res = await db.execute(select(func.count()).where(MRIStudy.patient_id == patient_id))
    pr.study_count = count_res.scalar() or 0
    return pr


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    await db.delete(patient)
    await db.commit()


@router.get("/{patient_id}/studies")
async def get_patient_studies(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles(*ALLOWED_ROLES)),
):
    result = await db.execute(
        select(MRIStudy).where(MRIStudy.patient_id == patient_id).order_by(MRIStudy.created_at.desc())
    )
    return result.scalars().all()
