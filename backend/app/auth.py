"""Claves mínimas de acceso para administración y dispositivos.

Las claves llegan solo por variables de entorno. La administración siempre exige
`ADMIN_KEY`; la clave del local se exige en cuanto `DEVICE_KEY` está configurada,
para permitir un despliegue gradual sin romper la sincronización existente.
"""

import hmac
import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status

from app.config import Settings, get_settings

_ADMIN_WINDOW_SECONDS = 60
_ADMIN_MAX_FAILURES = 5
_admin_failures: dict[str, deque[float]] = defaultdict(deque)


def _matches(expected: str, provided: str | None) -> bool:
    """Compara en tiempo constante para no filtrar la clave por longitud."""
    if not provided:
        return False
    return hmac.compare_digest(expected.encode("utf-8"), provided.encode("utf-8"))


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client is not None else "desconocido"


def _prune_failures(ip: str, now: float) -> deque[float]:
    failures = _admin_failures[ip]
    while failures and now - failures[0] > _ADMIN_WINDOW_SECONDS:
        failures.popleft()
    return failures


def reset_admin_rate_limit() -> None:
    """Solo para tests: limpia el contador de intentos fallidos."""
    _admin_failures.clear()


def require_admin(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
    x_admin_key: Annotated[str | None, Header(alias="X-Admin-Key")] = None,
) -> None:
    """Exige la clave de administración; si no está configurada, cierra el acceso."""
    if not settings.admin_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "La administración no está configurada"
        )

    ip = _client_ip(request)
    now = time.monotonic()
    if len(_prune_failures(ip, now)) >= _ADMIN_MAX_FAILURES:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Demasiados intentos; espera un minuto"
        )

    if not _matches(settings.admin_key, x_admin_key):
        _prune_failures(ip, now).append(now)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Clave de administración inválida")


def require_device(
    settings: Annotated[Settings, Depends(get_settings)],
    x_device_key: Annotated[str | None, Header(alias="X-Device-Key")] = None,
) -> None:
    """Exige la clave del local cuando está configurada en el servidor."""
    if not settings.device_key:
        return
    if not _matches(settings.device_key, x_device_key):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Clave del local inválida")
