"""Esquemas del contrato `POST /sync`."""

import re
from datetime import UTC, date, datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    field_serializer,
    model_validator,
)

from app.schemas.catalog import Unit
from app.timezones import business_timezone

PaymentMethod = Literal["cash", "card", "transfer"]
PriceSource = Literal["lista", "promocion", "mayoreo", "manual"]

_MONEY_PATTERN = re.compile(r"^\d{1,8}\.\d{2}$")
_CENT = Decimal("0.01")


def _parse_money(value: object) -> Decimal:
    """Acepta solo strings de 2 decimales; un número JSON se rechaza (P2)."""
    if isinstance(value, bool) or isinstance(value, float):
        raise ValueError("el dinero debe ser string decimal, nunca número")
    if isinstance(value, str):
        if not _MONEY_PATTERN.fullmatch(value):
            raise ValueError("el dinero debe tener exactamente 2 decimales")
        value = Decimal(value)
    if not isinstance(value, Decimal):
        raise ValueError("el dinero debe ser string decimal")
    exponent = value.as_tuple().exponent
    if isinstance(exponent, int) and exponent < -2:
        raise ValueError("el dinero no puede tener más de 2 decimales")
    if value <= 0:
        raise ValueError("el dinero debe ser mayor que cero")
    return value


Money = Annotated[Decimal, BeforeValidator(_parse_money)]
PositiveInt = Annotated[int, Field(strict=True, ge=1)]


class SyncLineIn(BaseModel):
    """Línea de la venta con el precio congelado al cobrar."""

    model_config = ConfigDict(extra="forbid")

    line_id: str = Field(min_length=1, max_length=64)
    product_id: str = Field(min_length=1, max_length=64)
    sku: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=80)
    category_name: str = Field(min_length=1, max_length=80)
    unit: Unit
    quantity: PositiveInt
    grams: Annotated[int | None, Field(strict=True, ge=1, le=999_999)] = None
    price_source: PriceSource
    catalog_unit_price: Money
    unit_price: Money
    line_total: Money

    @model_validator(mode="after")
    def _validate_line_total(self) -> "SyncLineIn":
        if self.unit == "kg":
            if self.grams is None:
                raise ValueError("una línea por kilo necesita gramos")
            if self.quantity != 1:
                raise ValueError("una línea por kilo lleva cantidad 1")
            expected = (self.unit_price * self.grams / Decimal(1000)).quantize(
                _CENT, rounding=ROUND_HALF_UP
            )
        else:
            if self.grams is not None:
                raise ValueError("una línea por pieza no lleva gramos")
            expected = self.unit_price * self.quantity
        if self.line_total != expected:
            raise ValueError("el importe de la línea no coincide con precio y cantidad")
        return self


class SyncTicketIn(BaseModel):
    """Payload del outbox tal como lo escribe la venta offline."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    client_order_uuid: UUID
    sold_at_utc: AwareDatetime
    business_date: date
    payment_method: PaymentMethod
    lines: list[SyncLineIn] = Field(min_length=1, max_length=200)
    total: Money
    catalog_updated_at: AwareDatetime

    @model_validator(mode="after")
    def _validate_ticket(self) -> "SyncTicketIn":
        local_date = self.sold_at_utc.astimezone(business_timezone()).date()
        if local_date != self.business_date:
            raise ValueError("business_date no coincide con el día local de sold_at_utc")
        total = sum((line.line_total for line in self.lines), Decimal("0.00"))
        if self.total != total:
            raise ValueError("el total no coincide con la suma de las líneas")
        return self


class SyncOut(BaseModel):
    """Resultado idempotente: creado o ya existente."""

    client_order_uuid: str
    status: Literal["created", "duplicate"]
    received_at: datetime

    @field_serializer("received_at", when_used="json")
    def _serialize_received_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
