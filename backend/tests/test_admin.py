"""Contrato de administración de precios y estado."""

from fastapi.testclient import TestClient

ADMIN_HEADERS = {"X-Admin-Key": "admin-secreta"}
PRODUCT_ID = "prd-pierna-muslo"


def test_admin_catalog_includes_inactive_products(secured_client: TestClient) -> None:
    secured_client.put(
        f"/admin/products/{PRODUCT_ID}", json={"active": False}, headers=ADMIN_HEADERS
    )

    admin_catalog = secured_client.get("/admin/catalog", headers=ADMIN_HEADERS)
    public_catalog = secured_client.get("/catalog")

    admin_ids = {product["id"] for product in admin_catalog.json()["products"]}
    public_ids = {product["id"] for product in public_catalog.json()["products"]}
    assert PRODUCT_ID in admin_ids
    assert PRODUCT_ID not in public_ids


def test_admin_replaces_prices_and_marks_the_default(secured_client: TestClient) -> None:
    response = secured_client.put(
        f"/admin/products/{PRODUCT_ID}",
        json={
            "prices": [
                {"tier": "lista", "price": "52.00", "is_default": True},
                {"tier": "mayoreo", "price": "48.00", "is_default": False},
            ]
        },
        headers=ADMIN_HEADERS,
    )

    assert response.status_code == 200
    body = response.json()
    assert [(price["tier"], price["price"]) for price in body["prices"]] == [
        ("lista", "52.00"),
        ("mayoreo", "48.00"),
    ]
    assert body["prices"][0]["is_default"] is True


def test_admin_update_requires_at_least_one_change(secured_client: TestClient) -> None:
    response = secured_client.put(
        f"/admin/products/{PRODUCT_ID}", json={}, headers=ADMIN_HEADERS
    )

    assert response.status_code == 422


def test_admin_rejects_prices_without_exactly_one_default(
    secured_client: TestClient,
) -> None:
    response = secured_client.put(
        f"/admin/products/{PRODUCT_ID}",
        json={
            "prices": [
                {"tier": "lista", "price": "52.00", "is_default": True},
                {"tier": "promocion", "price": "50.00", "is_default": True},
            ]
        },
        headers=ADMIN_HEADERS,
    )

    assert response.status_code == 422


def test_admin_rejects_a_float_price(secured_client: TestClient) -> None:
    response = secured_client.put(
        f"/admin/products/{PRODUCT_ID}",
        json={"prices": [{"tier": "lista", "price": 52.0, "is_default": True}]},
        headers=ADMIN_HEADERS,
    )

    assert response.status_code == 422


def test_admin_returns_404_for_unknown_product(secured_client: TestClient) -> None:
    response = secured_client.put(
        "/admin/products/prd-no-existe", json={"active": False}, headers=ADMIN_HEADERS
    )

    assert response.status_code == 404
