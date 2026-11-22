"""Persistencia idempotente de las ventas sincronizadas."""

from datetime import datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale, SaleLine
from app.schemas.sync import SyncTicketIn


class SqlSaleRepository:
    """Inserta una venta y sus líneas; el UUID del cliente evita duplicados."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def record(self, ticket: SyncTicketIn) -> tuple[bool, datetime]:
        """Devuelve `(creada, received_at)`; un reenvío no inserta nada."""
        client_order_uuid = str(ticket.client_order_uuid)
        sale_stmt = (
            insert(Sale)
            .values(
                client_order_uuid=client_order_uuid,
                schema_version=ticket.schema_version,
                sold_at_utc=ticket.sold_at_utc,
                business_date=ticket.business_date,
                payment_method=ticket.payment_method,
                total=ticket.total,
                catalog_updated_at=ticket.catalog_updated_at,
            )
            .on_conflict_do_nothing(index_elements=[Sale.client_order_uuid])
            .returning(Sale.received_at)
        )
        received_at = (await self._session.execute(sale_stmt)).scalar_one_or_none()

        if received_at is None:
            # El UUID ya existía: se cierra la transacción de escritura y se
            # devuelve la venta original sin tocar sus líneas.
            await self._session.rollback()
            existing = await self._session.get(Sale, client_order_uuid)
            if existing is None:
                raise RuntimeError("la venta no se pudo leer después del conflicto")
            return False, existing.received_at

        await self._session.execute(
            insert(SaleLine),
            [
                {
                    "client_order_uuid": client_order_uuid,
                    "line_id": line.line_id,
                    "product_id": line.product_id,
                    "sku": line.sku,
                    "name": line.name,
                    "category_name": line.category_name,
                    "unit": line.unit,
                    "quantity": line.quantity,
                    "grams": line.grams,
                    "price_source": line.price_source,
                    "catalog_unit_price": line.catalog_unit_price,
                    "unit_price": line.unit_price,
                    "line_total": line.line_total,
                }
                for line in ticket.lines
            ],
        )
        await self._session.commit()
        return True, received_at
