from datetime import UTC, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.catalog import CatalogOut, PriceOut, ProductOut


def test_decimal_is_serialized_as_two_decimal_string() -> None:
    price = PriceOut(tier="lista", price=Decimal("185.1"), is_default=True)

    assert price.model_dump(mode="json")["price"] == "185.10"


def test_float_price_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PriceOut(tier="lista", price=185.10, is_default=True)  # type: ignore[arg-type]


def test_price_with_three_decimals_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PriceOut(tier="lista", price=Decimal("185.123"), is_default=True)


def test_zero_price_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PriceOut(tier="lista", price=Decimal("0.00"), is_default=True)


def test_unknown_price_tier_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PriceOut(tier="b2b", price=Decimal("185.00"), is_default=True)  # type: ignore[arg-type]


def _product(**overrides: object) -> ProductOut:
    base = {
        "id": "prd-1",
        "sku": "POLLO-ENTERO",
        "name": "Pollo entero",
        "category_id": "cat-pollo",
        "unit": "kg",
        "active": True,
        "prices": [
            PriceOut(tier="lista", price=Decimal("185.00"), is_default=True),
            PriceOut(tier="promocion", price=Decimal("165.00"), is_default=False),
        ],
    }
    return ProductOut(**{**base, **overrides})  # type: ignore[arg-type]


def test_product_with_exactly_one_default_price_is_valid() -> None:
    assert _product().prices[0].price == Decimal("185.00")


def test_product_without_default_price_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _product(
            prices=[
                PriceOut(tier="lista", price=Decimal("185.00"), is_default=False),
            ]
        )


def test_product_with_two_default_prices_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _product(
            prices=[
                PriceOut(tier="lista", price=Decimal("185.00"), is_default=True),
                PriceOut(tier="promocion", price=Decimal("165.00"), is_default=True),
            ]
        )


def test_product_with_duplicate_tiers_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _product(
            prices=[
                PriceOut(tier="lista", price=Decimal("185.00"), is_default=True),
                PriceOut(tier="lista", price=Decimal("180.00"), is_default=False),
            ]
        )


def test_catalog_serializes_updated_at_in_utc_with_z() -> None:
    catalog = CatalogOut(
        updated_at=datetime(2026, 11, 11, 18, 4, tzinfo=UTC),
        categories=[],
        products=[_product()],
    )

    payload = catalog.model_dump(mode="json")

    assert payload["updated_at"] == "2026-11-11T18:04:00Z"
    assert payload["products"][0]["prices"][0]["price"] == "185.00"
