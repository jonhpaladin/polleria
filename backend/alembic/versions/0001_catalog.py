"""Crea las tablas del catálogo.

Revision ID: 0001_catalog
Revises:
Create Date: 2026-11-11
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_catalog"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("length(name) BETWEEN 1 AND 60", name="categories_name_length"),
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("sku", sa.Text(), nullable=False, unique=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "category_id",
            sa.Text(),
            sa.ForeignKey("categories.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("unit", sa.Text(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.CheckConstraint("length(name) BETWEEN 1 AND 60", name="products_name_length"),
        sa.CheckConstraint("unit IN ('piece','kg')", name="products_unit_valid"),
    )
    op.create_index("products_category_name_idx", "products", ["category_id", "name"])

    op.create_table(
        "product_prices",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column(
            "product_id",
            sa.Text(),
            sa.ForeignKey("products.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tier", sa.Text(), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("product_id", "tier", name="product_prices_product_tier_key"),
        sa.CheckConstraint(
            "tier IN ('lista','promocion','mayoreo')", name="product_prices_tier_valid"
        ),
        sa.CheckConstraint("price > 0", name="product_prices_price_positive"),
    )
    op.create_index(
        "product_prices_one_default_idx",
        "product_prices",
        ["product_id"],
        unique=True,
        postgresql_where=sa.text("is_default"),
    )

    op.create_table(
        "catalog_meta",
        sa.Column("id", sa.SmallInteger(), primary_key=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("id = 1", name="catalog_meta_single_row"),
    )
    op.execute("INSERT INTO catalog_meta (id, updated_at) VALUES (1, now())")


def downgrade() -> None:
    op.drop_table("catalog_meta")
    op.drop_index("product_prices_one_default_idx", table_name="product_prices")
    op.drop_table("product_prices")
    op.drop_index("products_category_name_idx", table_name="products")
    op.drop_table("products")
    op.drop_table("categories")
