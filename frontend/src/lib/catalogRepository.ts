import seedWire from "@/data/seedCatalog.json";
import { validateCatalogPayload } from "@/lib/catalog";
import { getDb, type PolleriaDb } from "@/lib/db";
import type { Catalog } from "@/types/catalog";

export type CatalogOrigin = "local" | "seed" | "fallback";

export interface LoadedCatalog {
  catalog: Catalog;
  origin: CatalogOrigin;
}

function normalizeSeed(raw: unknown): Catalog {
  const result = validateCatalogPayload(raw);
  if (!result.ok) {
    throw new Error(`Semilla inválida (${result.error.code}): ${result.error.detail}`);
  }
  return result.catalog;
}

/** Semilla del build, ya normalizada a centavos. */
export const seedCatalog: Catalog = normalizeSeed(seedWire);

function sortCategories(categories: Catalog["categories"]): Catalog["categories"] {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id, "es"),
  );
}

function sortProducts(products: Catalog["products"]): Catalog["products"] {
  return [...products].sort(
    (a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }) || a.id.localeCompare(b.id),
  );
}

/** Lee el catálogo completo en una sola transacción; `null` si no hay nada guardado. */
export async function readCatalog(db: PolleriaDb = getDb()): Promise<Catalog | null> {
  return db.transaction("r", db.categories, db.products, db.meta, async () => {
    const meta = await db.meta.get("catalog");
    const categories = await db.categories.toArray();
    const products = await db.products.toArray();
    if (!meta) {
      return null;
    }
    return {
      updatedAt: meta.value.updatedAt,
      categories: sortCategories(categories),
      products: sortProducts(products),
    };
  });
}

/**
 * Reemplaza el catálogo en una transacción única. Si algo falla, IndexedDB
 * conserva la versión anterior: nunca queda un catálogo a medias (P8).
 */
export async function writeCatalog(
  catalog: Catalog,
  db: PolleriaDb = getDb(),
): Promise<void> {
  await db.transaction("rw", db.categories, db.products, db.meta, async () => {
    await db.categories.clear();
    await db.products.clear();
    await db.categories.bulkAdd(catalog.categories);
    await db.products.bulkAdd(catalog.products);
    await db.meta.put({ key: "catalog", value: { updatedAt: catalog.updatedAt } });
  });
}

/** Siembra solo en el primer arranque y reporta de dónde salió lo mostrado. */
export async function seedIfEmpty(
  seed: Catalog,
  db: PolleriaDb = getDb(),
): Promise<LoadedCatalog> {
  const existing = await readCatalog(db);
  if (existing) {
    return { catalog: existing, origin: "local" };
  }
  await writeCatalog(seed, db);
  return { catalog: seed, origin: "seed" };
}

/**
 * Arranque local-first: si IndexedDB está bloqueada, llena o en una versión
 * más nueva que el build, devuelve la semilla en memoria sin romper la UI.
 */
export async function loadCatalog(
  seed: Catalog,
  db: PolleriaDb = getDb(),
): Promise<LoadedCatalog> {
  try {
    return await seedIfEmpty(seed, db);
  } catch (error) {
    console.warn("LOCAL_DB_UNAVAILABLE", error);
    return { catalog: seed, origin: "fallback" };
  }
}
