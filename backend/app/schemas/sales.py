"""Contrato de anulación de ventas."""

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class VoidSaleIn(BaseModel):
    """Motivo capturado por el mostrador; se guarda tal cual, sin el PIN."""

    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=3, max_length=200)

    @field_validator("reason")
    @classmethod
    def _trim_reason(cls, value: str) -> str:
        trimmed = value.strip()
        if len(trimmed) < 3:
            raise ValueError("el motivo debe tener al menos 3 caracteres")
        return trimmed


class VoidSaleOut(BaseModel):
    """Resultado idempotente de la anulación."""

    model_config = ConfigDict(extra="forbid")

    client_order_uuid: str
    status: Literal["voided"] = "voided"
    voided_at_utc: datetime

    @field_serializer("voided_at_utc", when_used="json")
    def _serialize_voided_at(self, value: datetime) -> str:
        return value.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
