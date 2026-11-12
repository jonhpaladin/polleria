from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.routers.catalog import get_catalog_repository
from app.routers.health import check_database
from app.schemas.catalog import CatalogOut, CategoryOut, PriceOut, ProductOut


def build_catalog() -> CatalogOut:
    return CatalogOut(
        updated_at=datetime(2026, 11, 11, 18, 4, tzinfo=UTC),
        categories=[
            CategoryOut(id="cat-pollo", name="Pollo", sort_order=1),
            CategoryOut(id="cat-promos", name="Promociones", sort_order=2),
        ],
        products=[
            ProductOut(
                id="prd-pierna-muslo",
                sku="PIERNA-MUSLO",
                name="Pierna y muslo",
                category_id="cat-pollo",
                unit="kg",
                active=True,
                prices=[
                    PriceOut(tier="lista", price=Decimal("150.00"), is_default=True),
                    PriceOut(tier="promocion", price=Decimal("130.00"), is_default=False),
                ],
            ),
            ProductOut(
                id="prd-combo-1",
                sku="COMBO-1",
                name="Combo familiar",
                category_id="cat-promos",
                unit="piece",
                active=True,
                prices=[
                    PriceOut(tier="lista", price=Decimal("299.00"), is_default=True),
                ],
            ),
        ],
    )


class FakeCatalogRepository:
    def __init__(self, catalog: CatalogOut) -> None:
        self.catalog = catalog
        self.seeded: object | None = None

    async def get_catalog(self) -> CatalogOut:
        return self.catalog

    async def seed(self, seed: object) -> None:
        self.seeded = seed


@pytest.fixture
def fake_repository() -> FakeCatalogRepository:
    return FakeCatalogRepository(build_catalog())


@pytest.fixture
def client(fake_repository: FakeCatalogRepository) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_catalog_repository] = lambda: fake_repository
    app.dependency_overrides[check_database] = lambda: "ok"
    with TestClient(app) as test_client:
        yield test_client
