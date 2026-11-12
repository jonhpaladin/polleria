"""Esquemas Pydantic del catálogo y del contrato de dinero."""

import re
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)

PriceTier = Literal["lista", "promocion", "mayoreo"]
Unit = Literal["piece", "kg"]

_MONEY_PATTERN = re.compile(r"^\d{1,8}\.\d{2}$")
_TIER_ORDER: dict[str, int] = {"lista": 0, "promocion": 1, "mayoreo": 2}


class PriceOut(BaseModel):
    """Precio de un nivel. El dinero viaja como string de 2 decimales."""

    model_config = ConfigDict(extra="forbid")

    tier: PriceTier
    price: Decimal
    is_default: bool

    @field_validator("price", mode="before")
    @classmethod
    def _validate_money(cls, value: object) -> Decimal:
        if isinstance(value, bool):
            raise ValueError("el precio no puede ser booleano")
        if isinstance(value, float):
            raise ValueError("el precio debe ser string decimal o Decimal, nunca float")
        if isinstance(value, str):
            if not _MONEY_PATTERN.fullmatch(value):
                raise ValueError("el precio debe tener exactamente 2 decimales")
            value = Decimal(value)
        if not isinstance(value, Decimal):
            raise ValueError("el precio debe ser string decimal o Decimal")
        exponent = value.as_tuple().exponent
        if isinstance(exponent, int) and exponent < -2:
            raise ValueError("el precio no puede tener más de 2 decimales")
        if value <= 0:
            raise ValueError("el precio debe ser mayor que cero")
        return value

    @field_serializer("price", when_used="json")
    def _serialize_money(self, value: Decimal) -> str:
        return format(value, ".2f")


class ProductOut(BaseModel):
    """Producto con todos sus precios por nivel."""

    model_config = ConfigDict(extra="forbid")

    id: str
    sku: str
    name: str = Field(min_length=1, max_length=60)
    category_id: str
    unit: Unit
    active: bool = True
    prices: list[PriceOut] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_prices(self) -> "ProductOut":
        tiers = [price.tier for price in self.prices]
        if len(tiers) != len(set(tiers)):
            raise ValueError("un producto no puede repetir el nivel de precio")
        defaults = sum(price.is_default for price in self.prices)
        if defaults != 1:
            raise ValueError("un producto debe tener exactamente un precio por defecto")
        self.prices.sort(key=lambda price: _TIER_ORDER[price.tier])
        return self


class CategoryOut(BaseModel):
    """Categoría del catálogo."""

    model_config = ConfigDict(extra="forbid")

    id: str
    name: str = Field(min_length=1, max_length=60)
    sort_order: int = 0


class CatalogOut(BaseModel):
    """Contrato de `GET /catalog` y de la semilla."""

    model_config = ConfigDict(extra="ignore")

    updated_at: datetime
    categories: list[CategoryOut]
    products: list[ProductOut]

    @field_serializer("updated_at", when_used="json")
    def _serialize_updated_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


class HealthOut(BaseModel):
    """Respuesta de `GET /health` sin detalles internos."""

    status: str
    version: str
    database: Literal["ok", "unreachable"]
