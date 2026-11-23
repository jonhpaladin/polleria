"""Cierra el acceso público y prepara el rol mínimo de la API.

Revision ID: 0003_seguridad
Revises: 0002_sales
Create Date: 2026-11-23
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_seguridad"
down_revision: str | None = "0002_sales"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

APP_TABLES = (
    "catalog_meta",
    "categories",
    "product_prices",
    "products",
    "sale_lines",
    "sales",
)
ALL_TABLES = ("alembic_version", *APP_TABLES)


def upgrade() -> None:
    """Habilita RLS, revoca el acceso público y crea `polleria_api` sin login.

    La contraseña del rol se define fuera del repo (Render + Supabase); la
    migración solo prepara privilegios y políticas.
    """
    for table in ALL_TABLES:
        op.execute(f"alter table public.{table} enable row level security")

    op.execute(
        """
        do $$
        begin
          if exists (select 1 from pg_roles where rolname = 'anon') then
            revoke all on all tables in schema public from anon;
            revoke all on all sequences in schema public from anon;
            revoke all on all functions in schema public from anon;
          end if;
          if exists (select 1 from pg_roles where rolname = 'authenticated') then
            revoke all on all tables in schema public from authenticated;
            revoke all on all sequences in schema public from authenticated;
            revoke all on all functions in schema public from authenticated;
          end if;
        end $$;
        """
    )

    op.execute(
        """
        do $$
        begin
          if not exists (select 1 from pg_roles where rolname = 'polleria_api') then
            create role polleria_api nologin;
          end if;
        end $$;
        """
    )
    op.execute("grant usage on schema public to polleria_api")
    op.execute(
        "grant select, insert, update, delete on table "
        + ", ".join(f"public.{table}" for table in APP_TABLES)
        + " to polleria_api"
    )
    op.execute("grant usage, select on all sequences in schema public to polleria_api")

    for table in APP_TABLES:
        op.execute(f"drop policy if exists polleria_api_all on public.{table}")
        op.execute(
            f"create policy polleria_api_all on public.{table} "
            "for all to polleria_api using (true) with check (true)"
        )


def downgrade() -> None:
    for table in APP_TABLES:
        op.execute(f"drop policy if exists polleria_api_all on public.{table}")
    op.execute(
        "revoke all on table " + ", ".join(f"public.{table}" for table in APP_TABLES)
        + " from polleria_api"
    )
    op.execute("revoke all on all sequences in schema public from polleria_api")
    op.execute("revoke usage on schema public from polleria_api")
    op.execute("drop role if exists polleria_api")
    for table in ALL_TABLES:
        op.execute(f"alter table public.{table} disable row level security")
