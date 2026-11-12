import asyncio
import os

import pytest
from alembic.config import Config
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic import command
from app.repositories.catalog import SqlCatalogRepository
from app.seed import load_seed

pytestmark = pytest.mark.integration


def _database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL", "")
    if not url:
        pytest.skip("TEST_DATABASE_URL no configurada")
    return url


async def test_migration_seed_is_idempotent_and_ordered() -> None:
    url = _database_url()
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    await asyncio.to_thread(command.upgrade, config, "head")

    engine = create_async_engine(url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    seed = load_seed()
    try:
        async with factory() as session:
            repository = SqlCatalogRepository(session)
            await repository.seed(seed)
            first = await repository.get_catalog()
            await repository.seed(seed)
            second = await repository.get_catalog()
    finally:
        await engine.dispose()

    assert len(first.categories) == len(seed.categories)
    assert len(second.products) == len(seed.products)
    assert second.updated_at >= first.updated_at
    assert all(product.prices for product in second.products)
    assert all(
        sum(price.is_default for price in product.prices) == 1 for product in second.products
    )
