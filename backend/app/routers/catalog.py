"""Endpoint de solo lectura del catálogo."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.repositories.catalog import SqlCatalogRepository
from app.schemas.catalog import CatalogOut

router = APIRouter(tags=["catálogo"])


def get_catalog_repository(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SqlCatalogRepository:
    """Dependencia inyectable: los tests de contrato la reemplazan sin base de datos."""
    return SqlCatalogRepository(session)


@router.get("/catalog", response_model=CatalogOut)
async def read_catalog(
    repository: Annotated[SqlCatalogRepository, Depends(get_catalog_repository)],
) -> CatalogOut:
    catalog = await repository.get_catalog()
    # El repositorio ya filtra en SQL; se repite aquí para que el contrato de
    # solo-activos no dependa de la implementación del repositorio.
    return catalog.model_copy(update={"products": [p for p in catalog.products if p.active]})
