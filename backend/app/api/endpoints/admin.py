from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, date
from typing import Optional
import math
import uuid
from app.core.database import get_db
from app.core.security import require_roles
from app.models.user import User
from app.models.patient import Patient
from app.models.study import MRIStudy, StudyStatus
from app.models.audit_log import AuditLog
from app.schemas.study import DashboardStats, AuditLogResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_patients = (await db.execute(select(func.count(Patient.id)))).scalar() or 0
    total_studies = (await db.execute(select(func.count(MRIStudy.id)))).scalar() or 0
    studies_today = (await db.execute(select(func.count(MRIStudy.id)).where(MRIStudy.created_at >= today_start))).scalar() or 0
    processing = (await db.execute(select(func.count(MRIStudy.id)).where(MRIStudy.status.in_([StudyStatus.PROCESSING, StudyStatus.QUEUED])))).scalar() or 0
    completed = (await db.execute(select(func.count(MRIStudy.id)).where(MRIStudy.status == StudyStatus.COMPLETED))).scalar() or 0
    failed = (await db.execute(select(func.count(MRIStudy.id)).where(MRIStudy.status == StudyStatus.FAILED))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    return DashboardStats(
        total_patients=total_patients,
        total_studies=total_studies,
        studies_today=studies_today,
        studies_processing=processing,
        studies_completed=completed,
        studies_failed=failed,
        total_users=total_users,
    )


@router.get("/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    query = select(AuditLog)
    if user_id:
        try:
            user_uuid = uuid.UUID(user_id)
            query = query.where(AuditLog.user_id == user_uuid)
        except ValueError:
            pass # Ignore invalid user_id format

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    query = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [AuditLogResponse.model_validate(log) for log in logs],
        "total": total,
        "page": page,
        "pages": math.ceil(total / page_size) if total else 1,
    }
