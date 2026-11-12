"""Engine asíncrono y sesiones de SQLAlchemy."""

from collections.abc import AsyncIterator
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings


@lru_cache
def get_engine() -> AsyncEngine:
    """Crea el engine la primera vez que se necesita.

    No se crea al importar el módulo: la app debe arrancar sin `DATABASE_URL`
    para que `/health` reporte `unreachable` en lugar de caerse.
    """
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL no configurada")
    return create_async_engine(settings.database_url, pool_pre_ping=True)


@lru_cache
def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Fábrica de sesiones ligada al engine del proceso."""
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependencia de FastAPI: una sesión por request."""
    async with get_sessionmaker()() as session:
        yield session
