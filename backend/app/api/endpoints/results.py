import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import require_roles, get_current_user
from app.models.result import SegmentationResult, ValidationStatus
from app.models.study import MRIStudy
from app.models.user import User
from app.schemas.study import SegmentationResultResponse, ValidationRequest
from app.core.config import settings

router = APIRouter(prefix="/results", tags=["Results"])


def _build_result_response(result: SegmentationResult, base_url: str) -> SegmentationResultResponse:
    r = SegmentationResultResponse.model_validate(result)
    if result.overlay_image_path and os.path.exists(result.overlay_image_path):
        r.overlay_image_url = f"/api/v1/results/{result.id}/overlay"
    if result.mask_file_path and os.path.exists(result.mask_file_path):
        r.mask_image_url = f"/api/v1/results/{result.id}/mask"
    return r


@router.get("/{result_id}", response_model=SegmentationResultResponse)
async def get_result(
    result_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    res = await db.execute(select(SegmentationResult).where(SegmentationResult.id == result_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return _build_result_response(result, str(request.base_url).rstrip("/"))


@router.get("/by-study/{study_id}", response_model=SegmentationResultResponse)
async def get_result_by_study(
    study_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    res = await db.execute(select(SegmentationResult).where(SegmentationResult.study_id == study_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="No result for this study yet")
    return _build_result_response(result, str(request.base_url).rstrip("/"))


@router.put("/{result_id}/validate", response_model=SegmentationResultResponse)
async def validate_result(
    result_id: uuid.UUID,
    body: ValidationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "radiologist")),
):
    res = await db.execute(select(SegmentationResult).where(SegmentationResult.id == result_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.validation_status = body.status
    result.validated_by = current_user.id
    result.validation_notes = body.notes
    result.validated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(result)
    return result


@router.get("/{result_id}/overlay")
async def get_overlay_image(
    result_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    res = await db.execute(select(SegmentationResult).where(SegmentationResult.id == result_id))
    result = res.scalar_one_or_none()
    if not result or not result.overlay_image_path:
        raise HTTPException(status_code=404, detail="Overlay not found")
    return FileResponse(result.overlay_image_path, media_type="image/png")


@router.get("/{result_id}/mask")
async def get_mask_image(
    result_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    res = await db.execute(select(SegmentationResult).where(SegmentationResult.id == result_id))
    result = res.scalar_one_or_none()
    if not result or not result.mask_file_path:
        raise HTTPException(status_code=404, detail="Mask not found")
    return FileResponse(result.mask_file_path, media_type="image/png")


@router.get("/{result_id}/report/pdf")
async def download_pdf_report(
    result_id: uuid.UUID,
    lang: str = "uz",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "doctor", "radiologist")),
):
    # Validate lang
    if lang not in ("uz", "en", "ru"):
        lang = "uz"

    res = await db.execute(select(SegmentationResult).where(SegmentationResult.id == result_id))
    result = res.scalar_one_or_none()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    # Generate per-language PDF (each language gets its own cached file)
    pdf_attr = f"pdf_report_path"
    current_path = getattr(result, pdf_attr, None)
    
    # Check if cached PDF for this lang exists
    lang_pdf_path = None
    if current_path:
        # Try lang-specific path
        base = current_path.replace(".pdf", "")
        candidate = f"{base}_{lang}.pdf" if not base.endswith(f"_{lang}") else current_path
        if os.path.exists(candidate):
            lang_pdf_path = candidate

    if not lang_pdf_path:
        from app.services.report_service import generate_pdf_report
        study_res = await db.execute(select(MRIStudy).where(MRIStudy.id == result.study_id))
        study = study_res.scalar_one()
        lang_pdf_path = await generate_pdf_report(result, study, db, lang=lang)
        # Cache the base path (uz default)
        if lang == "uz":
            result.pdf_report_path = lang_pdf_path
            await db.commit()

    return FileResponse(
        lang_pdf_path,
        media_type="application/pdf",
        filename=f"medsegai_report_{str(result_id)[:8]}_{lang}.pdf",
    )
