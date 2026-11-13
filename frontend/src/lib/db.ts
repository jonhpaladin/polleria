import Dexie, { type EntityTable } from "dexie";

import type { Category, Product } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";
import type { LocalTicket, OutboxRecord } from "@/types/sale";

export interface CatalogMetaRow {
  key: string;
  value: { updatedAt: string; localFolio?: number };
}

/**
 * Base local. Las migraciones futuras se agregan con `this.version(n)` y
 * nunca borran lo pendiente de sincronizar.
 */
export class PolleriaDb extends Dexie {
  categories!: EntityTable<Category, "id">;
  products!: EntityTable<Product, "id">;
  meta!: EntityTable<CatalogMetaRow, "key">;
  dailyPrices!: EntityTable<DailyPrice, "id">;
  tickets!: EntityTable<LocalTicket, "clientOrderUuid">;
  outbox!: EntityTable<OutboxRecord, "clientOrderUuid">;

  constructor(name = "polleria") {
    super(name);
    this.version(1).stores({
      categories: "id, sortOrder",
      products: "id, &sku, categoryId",
      meta: "key",
    });
    this.version(2).stores({
      categories: "id, sortOrder",
      products: "id, &sku, categoryId",
      meta: "key",
      dailyPrices: "&id, businessDate, productId",
      tickets: "&clientOrderUuid, businessDate, soldAtUtc",
      outbox: "&clientOrderUuid, status, enqueuedAt",
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
