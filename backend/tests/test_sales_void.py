"""Anulación de ventas sincronizadas."""

from fastapi.testclient import TestClient

from tests.conftest import FakeSaleRepository
from tests.test_sync import UUID, ticket_payload

DEVICE_HEADERS = {"X-Device-Key": "local-secreta"}


def test_void_requires_the_device_key(secured_client: TestClient) -> None:
    response = secured_client.post(
        f"/sales/{UUID}/void", json={"reason": "Cobro incorrecto"}
    )

    assert response.status_code == 401


def test_void_returns_404_for_an_unknown_sale(secured_client: TestClient) -> None:
    response = secured_client.post(
        f"/sales/{UUID}/void",
        json={"reason": "Cobro incorrecto"},
        headers=DEVICE_HEADERS,
    )

    assert response.status_code == 404


def test_void_marks_the_sale_and_is_idempotent(
    secured_client: TestClient, fake_sale_repository: FakeSaleRepository
) -> None:
    created = secured_client.post("/sync", json=ticket_payload(), headers=DEVICE_HEADERS)
    assert created.status_code == 201

    first = secured_client.post(
        f"/sales/{UUID}/void",
        json={"reason": "Cliente canceló"},
        headers=DEVICE_HEADERS,
    )
    second = secured_client.post(
        f"/sales/{UUID}/void",
        json={"reason": "Otro motivo"},
        headers=DEVICE_HEADERS,
    )

    assert first.status_code == 200
    assert first.json()["status"] == "voided"
    assert second.status_code == 200
    assert second.json()["voided_at_utc"] == first.json()["voided_at_utc"]
    assert fake_sale_repository.voids[UUID][0] == "Cliente canceló"


def test_void_rejects_a_short_reason(secured_client: TestClient) -> None:
    secured_client.post("/sync", json=ticket_payload(), headers=DEVICE_HEADERS)

    response = secured_client.post(
        f"/sales/{UUID}/void", json={"reason": " x "}, headers=DEVICE_HEADERS
    )

    assert response.status_code == 422
