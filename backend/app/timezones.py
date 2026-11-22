"""Zona de negocio con respaldo para entornos sin base IANA (Windows)."""

from datetime import timedelta, timezone, tzinfo
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.config import DEFAULT_TIME_ZONE, get_settings

# `America/Mexico_City` dejó el horario de verano en 2022: UTC-6 todo el año.
# Solo se usa cuando el sistema no trae tzdata; la zona configurada sigue mandando.
_MEXICO_CITY_FALLBACK = timezone(timedelta(hours=-6), name=DEFAULT_TIME_ZONE)


@lru_cache
def business_timezone() -> tzinfo:
    """Resuelve la zona configurada; en Windows sin tzdata cae al offset fijo."""
    name = get_settings().app_time_zone
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        if name != DEFAULT_TIME_ZONE:
            raise
        return _MEXICO_CITY_FALLBACK
