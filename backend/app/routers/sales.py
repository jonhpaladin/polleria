"""Anulación de ventas sincronizadas."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import require_device
from app.repositories.sales import SqlSaleRepository
from app.routers.sync import get_sale_repository
from app.schemas.sales import VoidSaleIn, VoidSaleOut

router = APIRouter(tags=["ventas"])


@router.post(
    "/sales/{client_order_uuid}/void",
    response_model=VoidSaleOut,
    dependencies=[Depends(require_device)],
)
async def void_sale(
    client_order_uuid: str,
    payload: VoidSaleIn,
    repository: Annotated[SqlSaleRepository, Depends(get_sale_repository)],
) -> VoidSaleOut:
    voided_at = await repository.void(client_order_uuid, payload.reason)
    if voided_at is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Venta no encontrada")
    return VoidSaleOut(client_order_uuid=client_order_uuid, voided_at_utc=voided_at)
