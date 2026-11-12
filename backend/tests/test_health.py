import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from app.routers import health as health_module


def test_health_without_database_returns_200_and_unreachable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Aísla el test del `.env`/CI: la URL vacía se fuerza en el módulo de salud.
    monkeypatch.setattr(health_module, "get_settings", lambda: Settings(database_url=""))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["database"] == "unreachable"
    assert "DATABASE_URL" not in response.text


def test_health_with_database(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["database"] == "ok"


def test_health_does_not_expose_connection_strings(client: TestClient) -> None:
    body = client.get("/health").text

    assert "postgres" not in body.lower()
    assert "asyncpg" not in body.lower()
    assert "password" not in body.lower()
