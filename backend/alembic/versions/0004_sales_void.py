"""Agrega la anulación de ventas.

Revision ID: 0004_sales_void
Revises: 0003_seguridad
Create Date: 2026-11-23
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0004_sales_void"
down_revision: str | None = "0003_seguridad"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

CONSTRAINT = (
    "(voided_at_utc IS NULL AND void_reason IS NULL) OR "
    "(voided_at_utc IS NOT NULL AND void_reason IS NOT NULL "
    "AND length(void_reason) BETWEEN 3 AND 200)"
)


def upgrade() -> None:
    # Idempotente: la base de producción ya recibió estas columnas por SQL.
    op.execute(
        "alter table public.sales add column if not exists "
        "voided_at_utc timestamp with time zone"
    )
    op.execute("alter table public.sales add column if not exists void_reason text")
    op.execute(
        "alter table public.sales drop constraint if exists sales_void_consistent"
    )
    op.execute(
        f"alter table public.sales add constraint sales_void_consistent check ({CONSTRAINT})"
    )


def downgrade() -> None:
    op.execute(
        "alter table public.sales drop constraint if exists sales_void_consistent"
    )
    op.execute("alter table public.sales drop column if exists void_reason")
    op.execute("alter table public.sales drop column if exists voided_at_utc")
