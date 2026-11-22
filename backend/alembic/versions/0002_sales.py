"""Crea las tablas de ventas sincronizadas.

Revision ID: 0002_sales
Revises: 0001_catalog
Create Date: 2026-11-22
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_sales"
down_revision: str | None = "0001_catalog"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sales",
        sa.Column("client_order_uuid", sa.Text(), primary_key=True),
        sa.Column("schema_version", sa.SmallInteger(), nullable=False),
        sa.Column("sold_at_utc", sa.DateTime(timezone=True), nullable=False),
        sa.Column("business_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.Text(), nullable=False),
        sa.Column("total", sa.Numeric(10, 2), nullable=False),
        sa.Column("catalog_updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "payment_method IN ('cash','card','transfer')",
            name="sales_payment_method_valid",
        ),
        sa.CheckConstraint("total > 0", name="sales_total_positive"),
    )
    op.create_index("sales_business_date_idx", "sales", ["business_date"])

    op.create_table(
        "sale_lines",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "client_order_uuid",
            sa.Text(),
            sa.ForeignKey("sales.client_order_uuid", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("line_id", sa.Text(), nullable=False),
        sa.Column("product_id", sa.Text(), nullable=False),
        sa.Column("sku", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("category_name", sa.Text(), nullable=False),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("grams", sa.Integer(), nullable=True),
        sa.Column("price_source", sa.Text(), nullable=False),
        sa.Column("catalog_unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
        sa.UniqueConstraint(
            "client_order_uuid", "line_id", name="sale_lines_sale_line_key"
        ),
        sa.CheckConstraint("unit IN ('piece','kg')", name="sale_lines_unit_valid"),
        sa.CheckConstraint(
            "price_source IN ('lista','promocion','mayoreo','manual')",
            name="sale_lines_price_source_valid",
        ),
        sa.CheckConstraint("quantity > 0", name="sale_lines_quantity_positive"),
        sa.CheckConstraint(
            "(unit = 'piece' AND grams IS NULL) OR (unit = 'kg' AND grams > 0)",
            name="sale_lines_measure_valid",
        ),
        sa.CheckConstraint(
            "catalog_unit_price > 0 AND unit_price > 0 AND line_total > 0",
            name="sale_lines_prices_positive",
        ),
    )
    op.create_index("sale_lines_sale_idx", "sale_lines", ["client_order_uuid"])


def downgrade() -> None:
    op.drop_index("sale_lines_sale_idx", table_name="sale_lines")
    op.drop_table("sale_lines")
    op.drop_index("sales_business_date_idx", table_name="sales")
    op.drop_table("sales")
