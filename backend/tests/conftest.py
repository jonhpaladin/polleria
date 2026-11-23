from collections.abc import Iterator
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.auth import reset_admin_rate_limit
from app.config import Settings, get_settings
from app.main import create_app
from app.routers.admin import get_admin_repository
from app.routers.catalog import get_catalog_repository
from app.routers.health import check_database
from app.routers.reports import get_report_repository
from app.routers.sync import get_sale_repository
from app.schemas.admin import AdminProductUpdateIn
from app.schemas.catalog import CatalogOut, CategoryOut, PriceOut, ProductOut
from app.schemas.reports import CategoryReportOut, DailyReportOut, ProductReportOut
from app.schemas.sync import SyncTicketIn


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

    async def get_catalog(self, include_inactive: bool = False) -> CatalogOut:
        if include_inactive:
            return self.catalog
        return self.catalog.model_copy(
            update={"products": [product for product in self.catalog.products if product.active]}
        )

    async def update_product(
        self, product_id: str, update: AdminProductUpdateIn
    ) -> ProductOut | None:
        product = next(
            (item for item in self.catalog.products if item.id == product_id), None
        )
        if product is None:
            return None

        data = product.model_dump()
        if update.active is not None:
            data["active"] = update.active
        if update.prices is not None:
            data["prices"] = [price.model_dump() for price in update.prices]

        updated = ProductOut.model_validate(data)
        self.catalog = self.catalog.model_copy(
            update={
                "products": [
                    updated if item.id == product_id else item
                    for item in self.catalog.products
                ],
                "updated_at": datetime.now(UTC),
            }
        )
        return updated

    async def seed(self, seed: object) -> None:
        self.seeded = seed


class FakeSaleRepository:
    """Registro en memoria que reproduce la idempotencia por UUID."""

    def __init__(self) -> None:
        self.sales: dict[str, tuple[SyncTicketIn, datetime]] = {}

    async def record(self, ticket: SyncTicketIn) -> tuple[bool, datetime]:
        key = str(ticket.client_order_uuid)
        if key in self.sales:
            return False, self.sales[key][1]
        received_at = datetime.now(UTC)
        self.sales[key] = (ticket, received_at)
        return True, received_at


@pytest.fixture
def fake_repository() -> FakeCatalogRepository:
    return FakeCatalogRepository(build_catalog())


@pytest.fixture
def fake_sale_repository() -> FakeSaleRepository:
    return FakeSaleRepository()


def build_report() -> DailyReportOut:
    return DailyReportOut(
        business_date=date(2026, 11, 14),
        ticket_count=2,
        total=Decimal("641.75"),
        by_payment_method={
            "cash": Decimal("440.00"),
            "card": Decimal("201.75"),
            "transfer": Decimal("0.00"),
        },
        products=[
            ProductReportOut(
                product_id="prd-pollo-asado",
                sku="POLLO-ASADO",
                name="Pollo asado",
                unit="piece",
                pieces=2,
                grams=0,
                total=Decimal("440.00"),
            )
        ],
        categories=[CategoryReportOut(name="Pollo fresco", total=Decimal("641.75"))],
    )


class FakeReportRepository:
    def __init__(self, report: DailyReportOut) -> None:
        self.report = report
        self.requested: date | None = None

    async def daily_report(self, business_date: date) -> DailyReportOut:
        self.requested = business_date
        return self.report


@pytest.fixture
def fake_report_repository() -> FakeReportRepository:
    return FakeReportRepository(build_report())


@pytest.fixture
def client(
    fake_repository: FakeCatalogRepository,
    fake_sale_repository: FakeSaleRepository,
    fake_report_repository: FakeReportRepository,
) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_catalog_repository] = lambda: fake_repository
    app.dependency_overrides[get_admin_repository] = lambda: fake_repository
    app.dependency_overrides[get_sale_repository] = lambda: fake_sale_repository
    app.dependency_overrides[get_report_repository] = lambda: fake_report_repository
    app.dependency_overrides[check_database] = lambda: "ok"
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def secured_client(client: TestClient) -> Iterator[TestClient]:
    """Cliente con claves configuradas, para probar los endpoints protegidos."""
    reset_admin_rate_limit()
    client.app.dependency_overrides[get_settings] = lambda: Settings(
        admin_key="admin-secreta", device_key="local-secreta"
    )
    yield client
    client.app.dependency_overrides.pop(get_settings, None)
    reset_admin_rate_limit()
