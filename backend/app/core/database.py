from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from loguru import logger


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables and seed first admin user."""
    from app.models import user as user_model  # noqa
    from app.models import patient as patient_model  # noqa
    from app.models import study as study_model  # noqa
    from app.models import result as result_model  # noqa
    from app.models import audit_log as audit_log_model  # noqa

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await _seed_admin()


async def _seed_admin():
    """Create default admin user if not exists."""
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    from sqlalchemy import select
    import uuid

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.FIRST_ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            admin = User(
                id=uuid.uuid4(),
                email=settings.FIRST_ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
                full_name=settings.FIRST_ADMIN_FULLNAME,
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Default admin created: {settings.FIRST_ADMIN_EMAIL}")
