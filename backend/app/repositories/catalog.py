"""Acceso a datos del catálogo. Independiente del router para poder testearlo."""

from datetime import UTC, datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CatalogMeta, Category, Product, ProductPrice
from app.schemas.catalog import CatalogOut, CategoryOut, PriceOut, ProductOut

_TIER_ORDER: dict[str, int] = {"lista": 0, "promocion": 1, "mayoreo": 2}


class SqlCatalogRepository:
    """Consultas y upserts del catálogo contra PostgreSQL."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_catalog(self) -> CatalogOut:
        """Devuelve categorías y solo productos activos, ordenados por categoría y nombre."""
        meta = await self._session.get(CatalogMeta, 1)
        updated_at = meta.updated_at if meta is not None else datetime.now(UTC)

        categories = (
            await self._session.scalars(
                select(Category).order_by(Category.sort_order, Category.name)
            )
        ).all()
        products = (
            await self._session.scalars(
                select(Product)
                .join(Category)
                .where(Product.active.is_(True))
                .options(selectinload(Product.prices))
                .order_by(Category.sort_order, Category.name, Product.name)
            )
        ).all()

        return CatalogOut(
            updated_at=updated_at,
            categories=[
                CategoryOut(id=category.id, name=category.name, sort_order=category.sort_order)
                for category in categories
            ],
            products=[
                ProductOut(
                    id=product.id,
                    sku=product.sku,
                    name=product.name,
                    category_id=product.category_id,
                    unit=product.unit,  # type: ignore[arg-type]
                    active=product.active,
                    prices=[
                        PriceOut(tier=price.tier, price=price.price, is_default=price.is_default)  # type: ignore[arg-type]
                        for price in sorted(
                            product.prices, key=lambda item: _TIER_ORDER.get(item.tier, 99)
                        )
                    ],
                )
                for product in products
            ],
        )

    async def seed(self, seed: CatalogOut) -> None:
        """Upsert idempotente por `id` de categoría y por `sku` de producto.

        Los productos retirados de la semilla no se borran: solo se actualizan los
        presentes. La versión del catálogo avanza siempre.
        """
        session = self._session

        for category in seed.categories:
            category_stmt = insert(Category).values(
                id=category.id, name=category.name, sort_order=category.sort_order
            )
            category_stmt = category_stmt.on_conflict_do_update(
                index_elements=[Category.id],
                set_={
                    "name": category_stmt.excluded.name,
                    "sort_order": category_stmt.excluded.sort_order,
                },
            )
            await session.execute(category_stmt)

        for product in seed.products:
            product_stmt = insert(Product).values(
                id=product.id,
                sku=product.sku,
                name=product.name,
                category_id=product.category_id,
                unit=product.unit,
                active=product.active,
            )
            product_stmt = product_stmt.on_conflict_do_update(
                index_elements=[Product.sku],
                set_={
                    "name": product_stmt.excluded.name,
                    "category_id": product_stmt.excluded.category_id,
                    "unit": product_stmt.excluded.unit,
                    "active": product_stmt.excluded.active,
                },
            ).returning(Product.id)
            product_id = (await session.execute(product_stmt)).scalar_one()

            # Se apagan primero todos los defaults para no violar el índice parcial
            # cuando el nivel por defecto cambia entre corridas.
            await session.execute(
                update(ProductPrice)
                .where(ProductPrice.product_id == product_id)
                .values(is_default=False)
            )

            for price in product.prices:
                price_stmt = insert(ProductPrice).values(
                    product_id=product_id,
                    tier=price.tier,
                    price=price.price,
                    is_default=price.is_default,
                )
                price_stmt = price_stmt.on_conflict_do_update(
                    index_elements=[ProductPrice.product_id, ProductPrice.tier],
                    set_={
                        "price": price_stmt.excluded.price,
                        "is_default": price_stmt.excluded.is_default,
                    },
                )
                await session.execute(price_stmt)

            await session.execute(
                delete(ProductPrice).where(
                    ProductPrice.product_id == product_id,
                    ProductPrice.tier.not_in([price.tier for price in product.prices]),
                )
            )

        meta_stmt = insert(CatalogMeta).values(id=1, updated_at=func.now())
        meta_stmt = meta_stmt.on_conflict_do_update(
            index_elements=[CatalogMeta.id], set_={"updated_at": func.now()}
        )
        await session.execute(meta_stmt)
        await session.commit()
