from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi.testclient import TestClient

from app.models.sale import Sale, SaleLine
from app.repositories.reports import build_daily_report
from tests.conftest import FakeReportRepository


def make_line(
    *,
    line_id: str,
    product_id: str,
    sku: str,
    name: str,
    unit: str,
    quantity: int,
    grams: int | None,
    unit_price: str,
    line_total: str,
) -> SaleLine:
    return SaleLine(
        line_id=line_id,
        product_id=product_id,
        sku=sku,
        name=name,
        category_name="Pollo fresco",
        unit=unit,
        quantity=quantity,
        grams=grams,
        price_source="lista",
        catalog_unit_price=Decimal(unit_price),
        unit_price=Decimal(unit_price),
        line_total=Decimal(line_total),
    )


def make_sale(
    client_order_uuid: str, payment_method: str, total: str, lines: list[SaleLine]
) -> Sale:
    sale = Sale(
        client_order_uuid=client_order_uuid,
        schema_version=1,
        sold_at_utc=datetime(2026, 11, 22, 18, 0, tzinfo=UTC),
        business_date=date(2026, 11, 22),
        payment_method=payment_method,
        total=Decimal(total),
        catalog_updated_at=datetime(2026, 11, 11, 18, 4, tzinfo=UTC),
    )
    sale.lines.extend(lines)
    return sale


def test_daily_report_returns_the_contract(client: TestClient) -> None:
    response = client.get("/reports/daily", params={"business_date": "2026-11-14"})

    assert response.status_code == 200
    assert response.json() == {
        "business_date": "2026-11-14",
        "ticket_count": 2,
        "total": "641.75",
        "by_payment_method": {
            "cash": "440.00",
            "card": "201.75",
            "transfer": "0.00",
        },
        "products": [
            {
                "product_id": "prd-pollo-asado",
                "sku": "POLLO-ASADO",
                "name": "Pollo asado",
                "unit": "piece",
                "pieces": 2,
                "grams": 0,
                "total": "440.00",
            }
        ],
        "categories": [{"name": "Pollo fresco", "total": "641.75"}],
    }


def test_daily_report_rejects_an_invalid_date(client: TestClient) -> None:
    assert (
        client.get("/reports/daily", params={"business_date": "ayer"}).status_code == 422
    )


def test_daily_report_uses_the_injected_repository(
    client: TestClient, fake_report_repository: FakeReportRepository
) -> None:
    client.get("/reports/daily", params={"business_date": "2026-11-14"})

    assert fake_report_repository.requested == date(2026, 11, 14)


def test_build_daily_report_aggregates_sales_and_units() -> None:
    cash_sale = make_sale(
        "11111111-1111-4111-8111-111111111111",
        "cash",
        "440.00",
        [
            make_line(
                line_id="linea-pieza",
                product_id="prd-pollo-asado",
                sku="POLLO-ASADO",
                name="Pollo asado",
                unit="piece",
                quantity=2,
                grams=None,
                unit_price="220.00",
                line_total="440.00",
            )
        ],
    )
    card_sale = make_sale(
        "22222222-2222-4222-8222-222222222222",
        "card",
        "201.75",
        [
            make_line(
                line_id="linea-kilo",
                product_id="prd-pierna-muslo",
                sku="PIERNA-MUSLO",
                name="Pierna y muslo",
                unit="kg",
                quantity=1,
                grams=1345,
                unit_price="150.00",
                line_total="201.75",
            )
        ],
    )

    report = build_daily_report([cash_sale, card_sale], date(2026, 11, 22))

    assert report.ticket_count == 2
    assert report.total == Decimal("641.75")
    assert report.by_payment_method == {
        "cash": Decimal("440.00"),
        "card": Decimal("201.75"),
        "transfer": Decimal("0.00"),
    }
    assert [product.product_id for product in report.products] == [
        "prd-pollo-asado",
        "prd-pierna-muslo",
    ]
    pollo, pierna = report.products
    assert (pollo.pieces, pollo.grams, pollo.total) == (2, 0, Decimal("440.00"))
    assert (pierna.pieces, pierna.grams, pierna.total) == (0, 1345, Decimal("201.75"))
    assert report.categories[0].name == "Pollo fresco"
    assert report.categories[0].total == Decimal("641.75")
