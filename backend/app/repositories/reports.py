"""Agregación del reporte diario a partir de ventas sincronizadas."""

from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sale import Sale
from app.schemas.reports import CategoryReportOut, DailyReportOut, ProductReportOut

_PAYMENT_METHODS = ("cash", "card", "transfer")
_ZERO = Decimal("0.00")


def build_daily_report(sales: Sequence[Sale], business_date: date) -> DailyReportOut:
    """Suma ventas y líneas; ignora las anuladas. Función pura para testear."""
    active_sales = [sale for sale in sales if sale.voided_at_utc is None]
    by_payment = {method: _ZERO for method in _PAYMENT_METHODS}
    products: dict[str, ProductReportOut] = {}
    categories: dict[str, Decimal] = {}
    total = _ZERO

    for sale in active_sales:
        total += sale.total
        by_payment[sale.payment_method] = (
            by_payment.get(sale.payment_method, _ZERO) + sale.total
        )
        for line in sale.lines:
            product = products.get(line.product_id)
            if product is None:
                product = ProductReportOut(
                    product_id=line.product_id,
                    sku=line.sku,
                    name=line.name,
                    unit=line.unit,  # type: ignore[arg-type]
                    pieces=0,
                    grams=0,
                    total=_ZERO,
                )
                products[line.product_id] = product
            if line.unit == "kg":
                product.grams += line.grams or 0
            else:
                product.pieces += line.quantity
            product.total += line.line_total
            categories[line.category_name] = (
                categories.get(line.category_name, _ZERO) + line.line_total
            )

    return DailyReportOut(
        business_date=business_date,
        ticket_count=len(active_sales),
        total=total,
        by_payment_method=by_payment,
        products=sorted(products.values(), key=lambda item: item.total, reverse=True),
        categories=[
            CategoryReportOut(name=name, total=amount)
            for name, amount in sorted(
                categories.items(), key=lambda item: item[1], reverse=True
            )
        ],
    )


class SqlReportRepository:
    """Carga las ventas del día con sus líneas y delega la suma a la función pura."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def daily_report(self, business_date: date) -> DailyReportOut:
        sales = (
            await self._session.scalars(
                select(Sale)
                .where(Sale.business_date == business_date)
                .where(Sale.voided_at_utc.is_(None))
                .options(selectinload(Sale.lines))
                .order_by(Sale.sold_at_utc)
            )
        ).all()
        return build_daily_report(sales, business_date)
