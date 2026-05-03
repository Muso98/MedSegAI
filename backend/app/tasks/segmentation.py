import uuid
from loguru import logger
from app.tasks.celery_app import celery_app


@celery_app.task(
    bind=True,
    name="app.tasks.segmentation.run_segmentation",
    max_retries=2,
    default_retry_delay=30,
)
def run_segmentation(self, study_id: str):
    """
    Celery task: run AI segmentation on an MRI study.
    Updates study status and creates/updates SegmentationResult.
    """
    import asyncio
    from app.core.database import AsyncSessionLocal
    from app.models.study import MRIStudy, StudyStatus
    from app.models.result import SegmentationResult
    from sqlalchemy import select

    logger.info(f"[Celery] Starting segmentation for study {study_id}")

    async def _run():
        async with AsyncSessionLocal() as db:
            # Fetch study
            result = await db.execute(select(MRIStudy).where(MRIStudy.id == uuid.UUID(study_id)))
            study = result.scalar_one_or_none()
            if not study:
                logger.error(f"Study {study_id} not found")
                return

            # Mark as processing
            study.status = StudyStatus.PROCESSING
            await db.commit()

            try:
                from app.ai.pipeline import run_inference
                ai_result = run_inference(study.file_path)

                # Check for existing result
                existing_res = await db.execute(
                    select(SegmentationResult).where(SegmentationResult.study_id == uuid.UUID(study_id))
                )
                seg = existing_res.scalar_one_or_none()

                if seg:
                    for key, val in ai_result.items():
                        setattr(seg, key, val)
                else:
                    seg = SegmentationResult(
                        id=uuid.uuid4(),
                        study_id=uuid.UUID(study_id),
                        model_name="Attention U-Net",
                        model_version="1.0",
                        **ai_result,
                    )
                    db.add(seg)

                study.status = StudyStatus.COMPLETED
                await db.commit()
                logger.info(f"[Celery] Study {study_id} completed successfully")

            except Exception as e:
                logger.exception(f"[Celery] Segmentation failed for {study_id}: {e}")
                study.status = StudyStatus.FAILED
                study.error_message = str(e)[:1000]
                await db.commit()
                raise self.retry(exc=e)

    asyncio.run(_run())
