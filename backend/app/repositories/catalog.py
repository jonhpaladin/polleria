"""Acceso a datos del catálogo. Independiente del router para poder testearlo."""

from datetime import UTC, datetime

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.catalog import CatalogMeta, Category, Product, ProductPrice
from app.schemas.admin import AdminProductUpdateIn
from app.schemas.catalog import CatalogOut, CategoryOut, PriceOut, ProductOut

_TIER_ORDER: dict[str, int] = {"lista": 0, "promocion": 1, "mayoreo": 2}


class SqlCatalogRepository:
    """Consultas y upserts del catálogo contra PostgreSQL."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_catalog(self, include_inactive: bool = False) -> CatalogOut:
        """Devuelve categorías y productos; por defecto solo los activos."""
        meta = await self._session.get(CatalogMeta, 1)
        updated_at = meta.updated_at if meta is not None else datetime.now(UTC)

        categories = (
            await self._session.scalars(
                select(Category).order_by(Category.sort_order, Category.name)
            )
        ).all()
        product_query = select(Product).join(Category)
        if not include_inactive:
            product_query = product_query.where(Product.active.is_(True))
        products = (
            await self._session.scalars(
                product_query.options(selectinload(Product.prices)).order_by(
                    Category.sort_order, Category.name, Product.name
                )
            )
        ).all()

        return CatalogOut(
            updated_at=updated_at,
            categories=[
                CategoryOut(id=category.id, name=category.name, sort_order=category.sort_order)
                for category in categories
            ],
            products=[self._product_out(product) for product in products],
        )

    @staticmethod
    def _product_out(product: Product, prices: list[PriceOut] | None = None) -> ProductOut:
        """Serializa un producto; permite reutilizar los precios recién escritos."""
        return ProductOut(
            id=product.id,
            sku=product.sku,
            name=product.name,
            category_id=product.category_id,
            unit=product.unit,  # type: ignore[arg-type]
            active=product.active,
            prices=prices
            if prices is not None
            else [
                PriceOut(tier=price.tier, price=price.price, is_default=price.is_default)  # type: ignore[arg-type]
                for price in sorted(
                    product.prices, key=lambda item: _TIER_ORDER.get(item.tier, 99)
                )
            ],
        )

    async def update_product(
        self, product_id: str, update: AdminProductUpdateIn
    ) -> ProductOut | None:
        """Actualiza estado y/o precios de un producto y avanza la versión del catálogo."""
        product = await self._session.scalar(
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.prices))
        )
        if product is None:
            return None

        if update.active is not None:
            product.active = update.active

        if update.prices is not None:
            await self._session.execute(
                delete(ProductPrice).where(ProductPrice.product_id == product_id)
            )
            for price in update.prices:
                self._session.add(
                    ProductPrice(
                        product_id=product_id,
                        tier=price.tier,
                        price=price.price,
                        is_default=price.is_default,
                    )
                )

        now = datetime.now(UTC)
        meta = await self._session.get(CatalogMeta, 1)
        if meta is None:
            self._session.add(CatalogMeta(id=1, updated_at=now))
        else:
            meta.updated_at = now

        await self._session.commit()
        return self._product_out(product, update.prices)

    async def seed(self, seed: CatalogOut) -> None:
        """Upsert idempotente por `id` de categoría y por `sku` de producto.

        Los productos retirados de la semilla se desactivan para que dejen de
        aparecer en `GET /catalog`; no se borran para conservar historial.
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

        # Primero se apaga todo; la semilla vuelve a activar solo sus productos.
        await session.execute(update(Product).values(active=False))

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
