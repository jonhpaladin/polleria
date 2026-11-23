"""Reporte diario de ventas sincronizadas."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories.reports import SqlReportRepository
from app.schemas.reports import DailyReportOut

router = APIRouter(tags=["reportes"])


def get_report_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SqlReportRepository:
    """Dependencia inyectable: los tests de contrato la reemplazan sin base de datos."""
    return SqlReportRepository(session)


@router.get("/reports/daily", response_model=DailyReportOut)
async def daily_report(
    business_date: date,
    repository: Annotated[SqlReportRepository, Depends(get_report_repository)],
) -> DailyReportOut:
    return await repository.daily_report(business_date)
