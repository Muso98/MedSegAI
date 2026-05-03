import os
import uuid
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.study import MRIStudy, FileFormat, StudyStatus
from app.models.result import SegmentationResult
from app.models.patient import Patient
from app.models.user import User
from app.schemas.study import StudyResponse, StudyStatusResponse, SegmentationResultResponse, ValidationRequest
from app.core.config import settings

router = APIRouter(prefix="/studies", tags=["Studies"])

ALLOWED_EXTENSIONS = {
    "png": FileFormat.PNG,
    "jpg": FileFormat.JPG,
    "jpeg": FileFormat.JPG,
    "nii": FileFormat.NIFTI,
    "gz": FileFormat.NIFTI,
}


@router.post("/upload", response_model=StudyResponse, status_code=201)
async def upload_study(
    patient_id: uuid.UUID = Form(...),
    title: Optional[str] = Form(None),
    body_part: str = Form("Brain"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "doctor", "operator")),
):
    # Validate patient
    pat_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not pat_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    # Validate extension
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported format: .{ext}. Allowed: PNG, JPG, NIfTI")

    # Size check
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)")

    # Save file
    study_id = uuid.uuid4()
    save_dir = os.path.join(settings.MEDIA_ROOT, "uploads", str(patient_id))
    os.makedirs(save_dir, exist_ok=True)
    save_path = os.path.join(save_dir, f"{study_id}_{filename}")

    async with aiofiles.open(save_path, "wb") as f:
        await f.write(content)

    study = MRIStudy(
        id=study_id,
        patient_id=patient_id,
        title=title,
        body_part=body_part,
        original_filename=filename,
        file_path=save_path,
        file_format=ALLOWED_EXTENSIONS[ext],
        file_size_bytes=len(content),
        status=StudyStatus.UPLOADED,
        uploaded_by=current_user.id,
    )
    db.add(study)
    await db.commit()
    await db.refresh(study)
    return study


@router.get("/{study_id}", response_model=StudyResponse)
async def get_study(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist", "operator")),
):
    result = await db.execute(select(MRIStudy).where(MRIStudy.id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    return study


@router.get("/{study_id}/status", response_model=StudyStatusResponse)
async def get_study_status(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist", "operator")),
):
    result = await db.execute(select(MRIStudy).where(MRIStudy.id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    result_id = None
    seg_result = await db.execute(select(SegmentationResult).where(SegmentationResult.study_id == study_id))
    seg = seg_result.scalar_one_or_none()
    if seg:
        result_id = seg.id

    return StudyStatusResponse(
        id=study.id,
        status=study.status,
        celery_task_id=study.celery_task_id,
        error_message=study.error_message,
        result_id=result_id,
    )


@router.post("/{study_id}/segment", status_code=202)
async def trigger_segmentation(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "doctor")),
):
    result = await db.execute(select(MRIStudy).where(MRIStudy.id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    if study.status == StudyStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Already processing")
    if study.status == StudyStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Already completed. Delete result first.")

    if settings.APP_ENV == "development":
        study.status = StudyStatus.PROCESSING
        await db.commit()
        import asyncio
        from loguru import logger
        logger.info("Running sync segmentation (development mode)")
        asyncio.create_task(_run_sync_segmentation(str(study_id)))
        return {"message": "Segmentation started (sync mode)", "study_id": str(study_id)}

    try:
        from app.tasks.segmentation import run_segmentation
        task = run_segmentation.delay(str(study_id))
        study.status = StudyStatus.QUEUED
        study.celery_task_id = task.id
        await db.commit()
        return {"message": "Segmentation queued", "task_id": task.id, "study_id": str(study_id)}
    except Exception as celery_err:
        # Celery/Redis mavjud bo'lmasa (local dev) — synchronous fallback
        import asyncio
        from loguru import logger
        logger.warning(f"Celery unavailable ({celery_err}), running sync segmentation...")
        study.status = StudyStatus.PROCESSING
        await db.commit()
        asyncio.create_task(_run_sync_segmentation(str(study_id)))
        return {"message": "Segmentation started (sync mode)", "study_id": str(study_id)}


async def _run_sync_segmentation(study_id: str):
    """Fallback: run segmentation in-process (no Celery needed for local dev)."""
    import uuid as _uuid
    from app.core.database import AsyncSessionLocal
    from app.models.study import MRIStudy, StudyStatus
    from app.models.result import SegmentationResult
    from sqlalchemy import select
    from loguru import logger

    async with AsyncSessionLocal() as db:
        res = await db.execute(select(MRIStudy).where(MRIStudy.id == _uuid.UUID(study_id)))
        study = res.scalar_one_or_none()
        if not study:
            return
        try:
            from app.ai.pipeline import run_inference
            ai_result = run_inference(study.file_path)
            existing = await db.execute(select(SegmentationResult).where(SegmentationResult.study_id == _uuid.UUID(study_id)))
            seg = existing.scalar_one_or_none()
            if seg:
                for k, v in ai_result.items():
                    setattr(seg, k, v)
            else:
                seg = SegmentationResult(
                    id=_uuid.uuid4(), study_id=_uuid.UUID(study_id),
                    model_name="Attention U-Net", model_version="1.0", **ai_result,
                )
                db.add(seg)
            study.status = StudyStatus.COMPLETED
            await db.commit()
            logger.info(f"Sync segmentation completed for {study_id}")
        except Exception as e:
            logger.exception(f"Sync segmentation failed: {e}")
            study.status = StudyStatus.FAILED
            study.error_message = str(e)[:1000]
            await db.commit()


@router.get("/{study_id}/image")
async def get_study_image(
    study_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    """Serve original uploaded image securely."""
    result = await db.execute(select(MRIStudy).where(MRIStudy.id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if not os.path.exists(study.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    return FileResponse(study.file_path)
