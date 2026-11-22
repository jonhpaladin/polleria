"""Endpoint de sincronización de ventas."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories.sales import SqlSaleRepository
from app.schemas.sync import SyncOut, SyncTicketIn

router = APIRouter(tags=["sincronización"])


def get_sale_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SqlSaleRepository:
    """Dependencia inyectable: los tests de contrato la reemplazan sin base de datos."""
    return SqlSaleRepository(session)


@router.post("/sync", response_model=SyncOut)
async def sync_ticket(
    ticket: SyncTicketIn,
    response: Response,
    repository: Annotated[SqlSaleRepository, Depends(get_sale_repository)],
) -> SyncOut:
    created, received_at = await repository.record(ticket)
    response.status_code = 201 if created else 200
    return SyncOut(
        client_order_uuid=str(ticket.client_order_uuid),
        status="created" if created else "duplicate",
        received_at=received_at,
    )
