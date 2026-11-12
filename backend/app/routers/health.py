"""Endpoint de salud. Nunca expone cadenas de conexión ni detalles internos."""

import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.config import get_settings
from app.db import get_engine
from app.schemas.catalog import HealthOut

router = APIRouter(tags=["salud"])

DatabaseStatus = Literal["ok", "unreachable"]


async def check_database() -> DatabaseStatus:
    """Comprueba la base con `SELECT 1` acotado; un fallo es un estado, no una excepción."""
    settings = get_settings()
    if not settings.database_url:
        return "unreachable"

    async def ping() -> None:
        async with get_engine().connect() as connection:
            await connection.execute(text("SELECT 1"))

    try:
        await asyncio.wait_for(ping(), timeout=2.0)
    except Exception:
        return "unreachable"
    return "ok"


@router.get("/health", response_model=HealthOut)
async def health(database: Annotated[DatabaseStatus, Depends(check_database)]) -> HealthOut:
    return HealthOut(status="ok", version=get_settings().app_version, database=database)
