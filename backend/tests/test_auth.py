"""Pruebas de las claves de administración y del local."""

from fastapi.testclient import TestClient

from tests.test_sync import ticket_payload

ADMIN_HEADERS = {"X-Admin-Key": "admin-secreta"}
DEVICE_HEADERS = {"X-Device-Key": "local-secreta"}


def test_sync_requires_the_device_key_when_configured(secured_client: TestClient) -> None:
    response = secured_client.post("/sync", json=ticket_payload())

    assert response.status_code == 401


def test_sync_accepts_the_device_key(secured_client: TestClient) -> None:
    response = secured_client.post("/sync", json=ticket_payload(), headers=DEVICE_HEADERS)

    assert response.status_code == 201


def test_sync_rejects_a_wrong_device_key(secured_client: TestClient) -> None:
    response = secured_client.post(
        "/sync", json=ticket_payload(), headers={"X-Device-Key": "otra"}
    )

    assert response.status_code == 401


def test_reports_require_the_device_key(secured_client: TestClient) -> None:
    response = secured_client.get("/reports/daily?business_date=2026-11-14")

    assert response.status_code == 401


def test_reports_accept_the_device_key(secured_client: TestClient) -> None:
    response = secured_client.get(
        "/reports/daily?business_date=2026-11-14", headers=DEVICE_HEADERS
    )

    assert response.status_code == 200


def test_admin_requires_the_admin_key(secured_client: TestClient) -> None:
    assert secured_client.get("/admin/catalog").status_code == 401
    assert (
        secured_client.get("/admin/catalog", headers={"X-Admin-Key": "otra"}).status_code
        == 401
    )
    assert secured_client.get("/admin/catalog", headers=ADMIN_HEADERS).status_code == 200


def test_admin_is_closed_when_the_key_is_not_configured(client: TestClient) -> None:
    response = client.get("/admin/catalog", headers=ADMIN_HEADERS)

    assert response.status_code == 503


def test_admin_limits_failed_attempts(secured_client: TestClient) -> None:
    for _ in range(5):
        response = secured_client.get(
            "/admin/catalog", headers={"X-Admin-Key": "incorrecta"}
        )
        assert response.status_code == 401

    blocked = secured_client.get(
        "/admin/catalog", headers={"X-Admin-Key": "incorrecta"}
    )

    assert blocked.status_code == 429
