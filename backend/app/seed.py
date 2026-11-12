"""Carga y aplicación idempotente de la semilla del catálogo."""

import asyncio
import json
from pathlib import Path

from app.db import get_sessionmaker
from app.repositories.catalog import SqlCatalogRepository
from app.schemas.catalog import CatalogOut

SEED_PATH = Path(__file__).resolve().parent / "seeds" / "catalog.json"


def load_seed(path: Path | None = None) -> CatalogOut:
    """Lee y valida la semilla canónica. Un JSON inválido lanza `ValueError`."""
    seed_path = path or SEED_PATH
    raw = json.loads(seed_path.read_text(encoding="utf-8"))
    return CatalogOut.model_validate(raw)


async def seed_catalog() -> None:
    """Upsert de la semilla en una sola transacción."""
    seed = load_seed()
    async with get_sessionmaker()() as session:
        await SqlCatalogRepository(session).seed(seed)


def main() -> None:
    asyncio.run(seed_catalog())


if __name__ == "__main__":
    main()
