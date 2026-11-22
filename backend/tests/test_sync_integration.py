import asyncio
import os
from uuid import uuid4

import pytest
from alembic.config import Config
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from alembic import command
from app.models.sale import Sale, SaleLine
from app.repositories.sales import SqlSaleRepository
from app.schemas.sync import SyncTicketIn
from tests.test_sync import ticket_payload

pytestmark = pytest.mark.integration


def _database_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL", "")
    if not url:
        pytest.skip("TEST_DATABASE_URL no configurada")
    return url


async def test_sync_does_not_duplicate_a_sale_in_postgres() -> None:
    url = _database_url()
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", url)
    await asyncio.to_thread(command.upgrade, config, "head")

    payload = ticket_payload()
    payload["client_order_uuid"] = str(uuid4())
    ticket = SyncTicketIn(**payload)

    engine = create_async_engine(url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            repository = SqlSaleRepository(session)
            first_created, first_received = await repository.record(ticket)
            second_created, second_received = await repository.record(ticket)
            sale_count = (
                await session.execute(
                    select(func.count())
                    .select_from(Sale)
                    .where(Sale.client_order_uuid == str(ticket.client_order_uuid))
                )
            ).scalar_one()
            line_count = (
                await session.execute(
                    select(func.count())
                    .select_from(SaleLine)
                    .where(SaleLine.client_order_uuid == str(ticket.client_order_uuid))
                )
            ).scalar_one()
    finally:
        await engine.dispose()

    assert first_created is True
    assert second_created is False
    assert first_received == second_received
    assert sale_count == 1
    assert line_count == len(ticket.lines)
