from copy import deepcopy

from fastapi.testclient import TestClient

from tests.conftest import FakeSaleRepository

UUID = "11111111-1111-4111-8111-111111111111"


def ticket_payload() -> dict:
    return {
        "schema_version": 1,
        "client_order_uuid": UUID,
        "sold_at_utc": "2026-11-14T18:30:00Z",
        "business_date": "2026-11-14",
        "payment_method": "cash",
        "lines": [
            {
                "line_id": "linea-pieza",
                "product_id": "prd-pollo-asado",
                "sku": "POLLO-ASADO",
                "name": "Pollo asado",
                "category_name": "Pollo fresco",
                "unit": "piece",
                "quantity": 2,
                "grams": None,
                "price_source": "lista",
                "catalog_unit_price": "220.00",
                "unit_price": "220.00",
                "line_total": "440.00",
            },
            {
                "line_id": "linea-kilo",
                "product_id": "prd-pierna-muslo",
                "sku": "PIERNA-MUSLO",
                "name": "Pierna y muslo",
                "category_name": "Pollo fresco",
                "unit": "kg",
                "quantity": 1,
                "grams": 1345,
                "price_source": "mayoreo",
                "catalog_unit_price": "170.00",
                "unit_price": "150.00",
                "line_total": "201.75",
            },
        ],
        "total": "641.75",
        "catalog_updated_at": "2026-11-11T18:04:00Z",
    }


def single_kg_payload(**line_overrides: object) -> dict:
    line: dict = {
        "line_id": "linea-kilo",
        "product_id": "prd-pierna-muslo",
        "sku": "PIERNA-MUSLO",
        "name": "Pierna y muslo",
        "category_name": "Pollo fresco",
        "unit": "kg",
        "quantity": 1,
        "grams": 5,
        "price_source": "lista",
        "catalog_unit_price": "1.00",
        "unit_price": "1.00",
        "line_total": "0.01",
    }
    line.update(line_overrides)
    return {
        "schema_version": 1,
        "client_order_uuid": "22222222-2222-4222-8222-222222222222",
        "sold_at_utc": "2026-11-14T18:30:00Z",
        "business_date": "2026-11-14",
        "payment_method": "cash",
        "lines": [line],
        "total": line["line_total"],
        "catalog_updated_at": "2026-11-11T18:04:00Z",
    }


def test_sync_creates_the_sale(
    client: TestClient, fake_sale_repository: FakeSaleRepository
) -> None:
    response = client.post("/sync", json=ticket_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["client_order_uuid"] == UUID
    assert body["status"] == "created"
    assert body["received_at"].endswith("Z")
    assert len(fake_sale_repository.sales) == 1


def test_sync_is_idempotent_by_client_order_uuid(
    client: TestClient, fake_sale_repository: FakeSaleRepository
) -> None:
    first = client.post("/sync", json=ticket_payload())
    second = client.post("/sync", json=ticket_payload())

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["status"] == "duplicate"
    assert len(fake_sale_repository.sales) == 1


def test_sync_rejects_a_business_date_outside_mexico_city(client: TestClient) -> None:
    payload = ticket_payload()
    payload["business_date"] = "2026-11-13"

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_money_as_a_json_number(client: TestClient) -> None:
    payload = ticket_payload()
    payload["lines"][0]["unit_price"] = 220.0

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_inconsistent_total(client: TestClient) -> None:
    payload = ticket_payload()
    payload["total"] = "640.00"

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_kg_line_without_grams(client: TestClient) -> None:
    payload = single_kg_payload(grams=None)

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_kg_line_with_quantity_not_one(client: TestClient) -> None:
    payload = single_kg_payload(quantity=2)

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_piece_line_with_grams(client: TestClient) -> None:
    payload = ticket_payload()
    payload["lines"][0]["grams"] = 500

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_line_total_mismatch(client: TestClient) -> None:
    payload = single_kg_payload(line_total="0.02")

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rounds_kilograms_half_up(client: TestClient) -> None:
    # 1.00 * 5 g / 1000 = 0.005 -> 0.01
    response = client.post("/sync", json=single_kg_payload())

    assert response.status_code == 201


def test_sync_rejects_unknown_fields(client: TestClient) -> None:
    payload = ticket_payload()
    payload["extra"] = True

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_naive_dates(client: TestClient) -> None:
    payload = ticket_payload()
    payload["sold_at_utc"] = "2026-11-14T18:30:00"

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_rejects_unknown_payment_method(client: TestClient) -> None:
    payload = ticket_payload()
    payload["payment_method"] = "bitcoin"

    assert client.post("/sync", json=payload).status_code == 422


def test_sync_keeps_the_original_lines_on_duplicate(
    client: TestClient, fake_sale_repository: FakeSaleRepository
) -> None:
    client.post("/sync", json=ticket_payload())
    changed = deepcopy(ticket_payload())
    changed["lines"] = changed["lines"][:1]
    changed["total"] = "440.00"

    response = client.post("/sync", json=changed)

    assert response.status_code == 200
    stored, _ = fake_sale_repository.sales[UUID]
    assert len(stored.lines) == 2
