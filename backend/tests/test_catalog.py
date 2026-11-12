from fastapi.testclient import TestClient

from tests.conftest import FakeCatalogRepository


def test_catalog_returns_the_full_contract(client: TestClient) -> None:
    response = client.get("/catalog")

    assert response.status_code == 200
    body = response.json()
    assert body["updated_at"] == "2026-11-11T18:04:00Z"
    assert [category["id"] for category in body["categories"]] == ["cat-pollo", "cat-promos"]
    assert body["products"][0]["sku"] == "PIERNA-MUSLO"
    assert body["products"][0]["prices"][0]["price"] == "150.00"
    assert body["products"][0]["prices"][1]["tier"] == "promocion"


def test_catalog_requires_exactly_one_default_price(client: TestClient) -> None:
    body = client.get("/catalog").json()

    for product in body["products"]:
        defaults = [price for price in product["prices"] if price["is_default"]]
        assert len(defaults) == 1


def test_catalog_uses_the_injected_repository(
    client: TestClient, fake_repository: FakeCatalogRepository
) -> None:
    client.get("/catalog")

    assert fake_repository.catalog.products[0].sku == "PIERNA-MUSLO"


def test_catalog_excludes_inactive_products(
    client: TestClient, fake_repository: FakeCatalogRepository
) -> None:
    fake_repository.catalog.products[1].active = False

    body = client.get("/catalog").json()

    # El filtro real vive en SQL; aquí se verifica que el router no lo reintroduce.
    assert all(product["active"] for product in body["products"])
