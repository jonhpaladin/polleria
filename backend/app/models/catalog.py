"""Modelos ORM del catálogo."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarativa del proyecto."""


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("length(name) BETWEEN 1 AND 60", name="categories_name_length"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    products: Mapped[list["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("length(name) BETWEEN 1 AND 60", name="products_name_length"),
        CheckConstraint("unit IN ('piece','kg')", name="products_unit_valid"),
        Index("products_category_name_idx", "category_id", "name"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    sku: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str] = mapped_column(
        Text, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    category: Mapped[Category] = relationship(back_populates="products")
    prices: Mapped[list["ProductPrice"]] = relationship(
        back_populates="product", cascade="all, delete-orphan"
    )


class ProductPrice(Base):
    __tablename__ = "product_prices"
    __table_args__ = (
        UniqueConstraint("product_id", "tier", name="product_prices_product_tier_key"),
        CheckConstraint(
            "tier IN ('lista','promocion','mayoreo')", name="product_prices_tier_valid"
        ),
        CheckConstraint("price > 0", name="product_prices_price_positive"),
        Index(
            "product_prices_one_default_idx",
            "product_id",
            unique=True,
            postgresql_where=text("is_default"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    product_id: Mapped[str] = mapped_column(
        Text, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    tier: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    product: Mapped[Product] = relationship(back_populates="prices")


class CatalogMeta(Base):
    """Fila única con la versión del catálogo que consume el cliente."""

    __tablename__ = "catalog_meta"
    __table_args__ = (CheckConstraint("id = 1", name="catalog_meta_single_row"),)

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
