"""Contrato de administración del catálogo."""

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.catalog import PriceOut


class AdminProductUpdateIn(BaseModel):
    """Cambios permitidos: estado y precios; nombre, SKU y unidad siguen por semilla."""

    model_config = ConfigDict(extra="forbid")

    active: bool | None = None
    prices: list[PriceOut] | None = None

    @model_validator(mode="after")
    def _validate_update(self) -> "AdminProductUpdateIn":
        if self.active is None and self.prices is None:
            raise ValueError("envía `active` o `prices`")
        if self.prices is not None:
            if not self.prices:
                raise ValueError("`prices` no puede venir vacío")
            tiers = [price.tier for price in self.prices]
            if len(tiers) != len(set(tiers)):
                raise ValueError("un producto no puede repetir el nivel de precio")
            if sum(price.is_default for price in self.prices) != 1:
                raise ValueError("debe haber exactamente un precio por defecto")
        return self
