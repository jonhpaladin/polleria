import { MoneyError, parseMoneyToCents } from "@/lib/money";
import type {
  Catalog,
  Category,
  PriceTier,
  Product,
  ProductPrice,
  Unit,
} from "@/types/catalog";

export type CatalogErrorCode =
  | "INVALID_SHAPE"
  | "INVALID_MONEY"
  | "INVALID_PRICE"
  | "UNKNOWN_UNIT"
  | "INVALID_TIER"
  | "MISSING_PRICE"
  | "INVALID_DEFAULT_PRICE"
  | "DUPLICATE_ID"
  | "DUPLICATE_SKU"
  | "ORPHAN_CATEGORY";

export interface CatalogError {
  code: CatalogErrorCode;
  detail: string;
}

export type CatalogResult = { ok: true; catalog: Catalog } | { ok: false; error: CatalogError };

const TIERS: readonly PriceTier[] = ["lista", "promocion", "mayoreo"];
const TIER_ORDER: Record<PriceTier, number> = { lista: 0, promocion: 1, mayoreo: 2 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: CatalogErrorCode, detail: string): CatalogResult {
  return { ok: false, error: { code, detail } };
}

function sortCategories(categories: Category[]): Category[] {
  return categories.sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id, "es"),
  );
}

function sortProducts(products: Product[]): Product[] {
  return products.sort(
    (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id),
  );
}

/**
 * Valida el payload completo del backend. Nunca lanza: devuelve el primer
 * error encontrado y descarta todo el payload, según RF-7.
 */
export function validateCatalogPayload(raw: unknown): CatalogResult {
  if (!isRecord(raw) || typeof raw.updated_at !== "string") {
    return fail("INVALID_SHAPE", "El payload no tiene updated_at");
  }
  if (!Array.isArray(raw.categories) || !Array.isArray(raw.products)) {
    return fail("INVALID_SHAPE", "Faltan categories o products");
  }

  const categories: Category[] = [];
  const categoryIds = new Set<string>();

  for (const [index, rawCategory] of raw.categories.entries()) {
    if (
      !isRecord(rawCategory) ||
      typeof rawCategory.id !== "string" ||
      typeof rawCategory.name !== "string" ||
      typeof rawCategory.sort_order !== "number"
    ) {
      return fail("INVALID_SHAPE", `Categoría inválida en la posición ${index}`);
    }
    if (categoryIds.has(rawCategory.id)) {
      return fail("DUPLICATE_ID", `Categoría repetida: ${rawCategory.id}`);
    }
    categoryIds.add(rawCategory.id);
    categories.push({
      id: rawCategory.id,
      name: rawCategory.name,
      sortOrder: rawCategory.sort_order,
    });
  }

  const products: Product[] = [];
  const productIds = new Set<string>();
  const skus = new Set<string>();

  for (const [index, rawProduct] of raw.products.entries()) {
    if (
      !isRecord(rawProduct) ||
      typeof rawProduct.id !== "string" ||
      typeof rawProduct.sku !== "string" ||
      typeof rawProduct.name !== "string" ||
      typeof rawProduct.category_id !== "string" ||
      typeof rawProduct.active !== "boolean" ||
      !Array.isArray(rawProduct.prices)
    ) {
      return fail("INVALID_SHAPE", `Producto inválido en la posición ${index}`);
    }
    if (productIds.has(rawProduct.id)) {
      return fail("DUPLICATE_ID", `Producto repetido: ${rawProduct.id}`);
    }
    if (skus.has(rawProduct.sku)) {
      return fail("DUPLICATE_SKU", `SKU repetido: ${rawProduct.sku}`);
    }
    if (rawProduct.unit !== "piece" && rawProduct.unit !== "kg") {
      return fail("UNKNOWN_UNIT", `Unidad desconocida: ${String(rawProduct.unit)}`);
    }
    if (rawProduct.prices.length === 0) {
      return fail("MISSING_PRICE", `El producto ${rawProduct.sku} no tiene precios`);
    }
    if (!categoryIds.has(rawProduct.category_id)) {
      return fail("ORPHAN_CATEGORY", `El producto ${rawProduct.sku} apunta a una categoría inexistente`);
    }

    const tiers = new Set<PriceTier>();
    const prices: ProductPrice[] = [];
    let defaults = 0;

    for (const rawPrice of rawProduct.prices) {
      if (
        !isRecord(rawPrice) ||
        typeof rawPrice.tier !== "string" ||
        typeof rawPrice.is_default !== "boolean"
      ) {
        return fail("INVALID_SHAPE", `Precio inválido en ${rawProduct.sku}`);
      }
      if (!TIERS.includes(rawPrice.tier as PriceTier) || tiers.has(rawPrice.tier as PriceTier)) {
        return fail("INVALID_TIER", `Nivel inválido o repetido en ${rawProduct.sku}: ${rawPrice.tier}`);
      }
      if (typeof rawPrice.price !== "string") {
        return fail("INVALID_MONEY", `Precio no textual en ${rawProduct.sku}`);
      }

      let priceCents;
      try {
        priceCents = parseMoneyToCents(rawPrice.price);
      } catch (error) {
        if (error instanceof MoneyError) {
          return fail("INVALID_MONEY", `Precio inválido en ${rawProduct.sku}: ${rawPrice.price}`);
        }
        throw error;
      }
      if (priceCents <= 0) {
        return fail("INVALID_PRICE", `Precio no positivo en ${rawProduct.sku}`);
      }

      const tier = rawPrice.tier as PriceTier;
      tiers.add(tier);
      if (rawPrice.is_default) {
        defaults += 1;
      }
      prices.push({ tier, priceCents, isDefault: rawPrice.is_default });
    }

    if (defaults !== 1) {
      return fail(
        "INVALID_DEFAULT_PRICE",
        `El producto ${rawProduct.sku} debe tener exactamente un precio por defecto`,
      );
    }

    prices.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    productIds.add(rawProduct.id);
    skus.add(rawProduct.sku);
    products.push({
      id: rawProduct.id,
      sku: rawProduct.sku,
      name: rawProduct.name,
      categoryId: rawProduct.category_id,
      unit: rawProduct.unit as Unit,
      prices,
      active: rawProduct.active,
    });
  }

  return {
    ok: true,
    catalog: {
      updatedAt: raw.updated_at,
      categories: sortCategories(categories),
      products: sortProducts(products),
    },
  };
}

export function defaultPrice(product: Product): ProductPrice | undefined {
  return product.prices.find((price) => price.isDefault);
}

export function promoPrice(product: Product): ProductPrice | undefined {
  return product.prices.find((price) => price.tier === "promocion");
}

/** Oculta categorías sin productos activos y ordena por `sortOrder`. */
export function visibleCategories(categories: Category[], products: Product[]): Category[] {
  return categories
    .filter((category) =>
      products.some((product) => product.active && product.categoryId === category.id),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id, "es"));
}

/** Filtra por categoría ("all" = todas) y ordena por nombre. */
export function selectProducts(products: Product[], categoryId: string): Product[] {
  return products
    .filter(
      (product) =>
        product.active && (categoryId === "all" || product.categoryId === categoryId),
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id),
    );
}

/** Texto relativo para el sello de versión; `now` se inyecta para poder testearlo. */
export function formatUpdatedAt(iso: string, now: Date): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return "actualizado recientemente";
  }
  const diffMs = Math.max(0, now.getTime() - then.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "actualizado hace unos segundos";
  }
  if (minutes < 60) {
    return `actualizado hace ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `actualizado hace ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `actualizado hace ${days} ${days === 1 ? "día" : "días"}`;
}
