"""Modelos ORM de las ventas sincronizadas."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.catalog import Base


class Sale(Base):
    """Venta recibida del mostrador; el UUID del cliente es la llave idempotente."""

    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint(
            "payment_method IN ('cash','card','transfer')", name="sales_payment_method_valid"
        ),
        CheckConstraint("total > 0", name="sales_total_positive"),
        Index("sales_business_date_idx", "business_date"),
    )

    client_order_uuid: Mapped[str] = mapped_column(Text, primary_key=True)
    schema_version: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    sold_at_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(Text, nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    catalog_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    lines: Mapped[list["SaleLine"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan"
    )


class SaleLine(Base):
    """Snapshot de la línea: no depende del catálogo vigente."""

    __tablename__ = "sale_lines"
    __table_args__ = (
        UniqueConstraint(
            "client_order_uuid", "line_id", name="sale_lines_sale_line_key"
        ),
        CheckConstraint("unit IN ('piece','kg')", name="sale_lines_unit_valid"),
        CheckConstraint(
            "price_source IN ('lista','promocion','mayoreo','manual')",
            name="sale_lines_price_source_valid",
        ),
        CheckConstraint("quantity > 0", name="sale_lines_quantity_positive"),
        CheckConstraint(
            "(unit = 'piece' AND grams IS NULL) OR "
            "(unit = 'kg' AND grams IS NOT NULL AND grams > 0)",
            name="sale_lines_measure_valid",
        ),
        CheckConstraint(
            "catalog_unit_price > 0 AND unit_price > 0 AND line_total > 0",
            name="sale_lines_prices_positive",
        ),
        Index("sale_lines_sale_idx", "client_order_uuid"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    client_order_uuid: Mapped[str] = mapped_column(
        Text, ForeignKey("sales.client_order_uuid", ondelete="CASCADE"), nullable=False
    )
    line_id: Mapped[str] = mapped_column(Text, nullable=False)
    product_id: Mapped[str] = mapped_column(Text, nullable=False)
    sku: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_name: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    grams: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_source: Mapped[str] = mapped_column(Text, nullable=False)
    catalog_unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    sale: Mapped[Sale] = relationship(back_populates="lines")
