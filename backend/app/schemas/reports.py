"""Esquemas del reporte diario conciliado."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, field_serializer

from app.schemas.catalog import Unit


class ProductReportOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str
    sku: str
    name: str
    unit: Unit
    pieces: int
    grams: int
    total: Decimal

    @field_serializer("total", when_used="json")
    def _serialize_total(self, value: Decimal) -> str:
        return format(value, ".2f")


class CategoryReportOut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    total: Decimal

    @field_serializer("total", when_used="json")
    def _serialize_total(self, value: Decimal) -> str:
        return format(value, ".2f")


class DailyReportOut(BaseModel):
    """Contrato de `GET /reports/daily`; el dinero viaja como string."""

    model_config = ConfigDict(extra="forbid")

    business_date: date
    ticket_count: int
    total: Decimal
    by_payment_method: dict[str, Decimal]
    products: list[ProductReportOut]
    categories: list[CategoryReportOut]

    @field_serializer("total", when_used="json")
    def _serialize_total(self, value: Decimal) -> str:
        return format(value, ".2f")

    @field_serializer("by_payment_method", when_used="json")
    def _serialize_payments(self, value: dict[str, Decimal]) -> dict[str, str]:
        return {key: format(amount, ".2f") for key, amount in value.items()}
