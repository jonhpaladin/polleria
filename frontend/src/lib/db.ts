import Dexie, { type EntityTable } from "dexie";

import type { Category, Product } from "@/types/catalog";

export interface CatalogMetaRow {
  key: string;
  value: { updatedAt: string };
}

/**
 * Base local v1. Las migraciones futuras se agregan con `this.version(n)` y
 * nunca borran lo pendiente de sincronizar.
 */
export class PolleriaDb extends Dexie {
  categories!: EntityTable<Category, "id">;
  products!: EntityTable<Product, "id">;
  meta!: EntityTable<CatalogMetaRow, "key">;

  constructor(name = "polleria") {
    super(name);
    this.version(1).stores({
      categories: "id, sortOrder",
      products: "id, &sku, categoryId",
      meta: "key",
    });
  }
}

let defaultDb: PolleriaDb | null = null;

/** Instancia única de la app; se abre de forma diferida en la primera consulta. */
export function getDb(): PolleriaDb {
  defaultDb ??= new PolleriaDb();
  return defaultDb;
}

/** Fábrica para tests: cada uno usa un nombre de base distinto. */
export function createDb(name?: string): PolleriaDb {
  return new PolleriaDb(name);
}
