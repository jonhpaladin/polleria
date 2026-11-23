"""Administración del catálogo: precios y estado de los productos."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_admin
from app.db import get_session
from app.repositories.catalog import SqlCatalogRepository
from app.schemas.admin import AdminProductUpdateIn
from app.schemas.catalog import CatalogOut, ProductOut

router = APIRouter(
    prefix="/admin",
    tags=["administración"],
    dependencies=[Depends(require_admin)],
)


def get_admin_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SqlCatalogRepository:
    """Dependencia inyectable para los tests de contrato."""
    return SqlCatalogRepository(session)


@router.get("/catalog", response_model=CatalogOut)
async def read_admin_catalog(
    repository: Annotated[SqlCatalogRepository, Depends(get_admin_repository)],
) -> CatalogOut:
    """Catálogo completo, incluidos los productos inactivos."""
    return await repository.get_catalog(include_inactive=True)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update_admin_product(
    product_id: str,
    update: AdminProductUpdateIn,
    repository: Annotated[SqlCatalogRepository, Depends(get_admin_repository)],
) -> ProductOut:
    """Reemplaza precios y/o cambia el estado; avanza la versión del catálogo."""
    product = await repository.update_product(product_id, update)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Producto no encontrado")
    return product
