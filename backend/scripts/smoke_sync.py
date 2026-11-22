"""Prueba de humo de `POST /sync` contra una API desplegada.

Uso:
    python scripts/smoke_sync.py https://mi-api.onrender.com

Crea una venta de prueba, la reenvía para comprobar la idempotencia y verifica que
el backend rechace un kilo sin gramos y un día de negocio incorrecto. Imprime el
UUID al final para poder borrar la venta de prueba con SQL.
"""

import sys
from uuid import uuid4

import httpx


def ticket(client_order_uuid: str) -> dict:
    return {
        "schema_version": 1,
        "client_order_uuid": client_order_uuid,
        "sold_at_utc": "2026-11-22T18:30:00Z",
        "business_date": "2026-11-22",
        "payment_method": "cash",
        "lines": [
            {
                "line_id": "smoke-1",
                "product_id": "prd-pierna-muslo",
                "sku": "PIERNA-MUSLO",
                "name": "Pierna y muslo",
                "category_name": "Pollo fresco",
                "unit": "kg",
                "quantity": 1,
                "grams": 500,
                "price_source": "lista",
                "catalog_unit_price": "150.00",
                "unit_price": "150.00",
                "line_total": "75.00",
            }
        ],
        "total": "75.00",
        "catalog_updated_at": "2026-11-11T18:04:00Z",
    }


def check(label: str, response: httpx.Response, expected: int) -> None:
    if response.status_code != expected:
        raise SystemExit(
            f"FALLO {label}: {response.status_code} != {expected}: {response.text[:200]}"
        )
    print(f"ok  {label}: {response.status_code}")


def main(base_url: str) -> None:
    url = f"{base_url.rstrip('/')}/sync"
    client_order_uuid = str(uuid4())
    print(f"UUID de prueba: {client_order_uuid}")

    with httpx.Client(timeout=30) as client:
        check("venta creada", client.post(url, json=ticket(client_order_uuid)), 201)
        duplicate = client.post(url, json=ticket(client_order_uuid))
        check("reenvío idempotente", duplicate, 200)
        if duplicate.json().get("status") != "duplicate":
            raise SystemExit("FALLO reenvío: se esperaba status=duplicate")

        invalid_measure = ticket(str(uuid4()))
        invalid_measure["lines"][0]["grams"] = None
        check("kilo sin gramos rechazado", client.post(url, json=invalid_measure), 422)

        wrong_date = ticket(str(uuid4()))
        wrong_date["business_date"] = "2026-11-21"
        check("día de negocio inválido rechazado", client.post(url, json=wrong_date), 422)

    print(f"smoke ok contra {base_url}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/smoke_sync.py https://mi-api.onrender.com")
    main(sys.argv[1])
