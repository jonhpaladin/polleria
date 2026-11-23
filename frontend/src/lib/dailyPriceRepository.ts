import { getDb, type PolleriaDb } from "@/lib/db";
import {
  buildBaseDailyPrices,
  businessDate,
  copyDailyPrices,
  parseOptionalPrice,
} from "@/lib/dailyPrices";
import type { Catalog, Cents } from "@/types/catalog";
import type { DailyPrice, DailyPriceDraft } from "@/types/dailyPrice";

export interface OpenDailyPricesResult {
  rows: DailyPrice[];
  saved: boolean;
  businessDate: string;
}

function sortRows(rows: DailyPrice[], catalog: Catalog): DailyPrice[] {
  const order = new Map(catalog.products.map((product, index) => [product.id, index]));
  return [...rows].sort((a, b) => (order.get(a.productId) ?? 0) - (order.get(b.productId) ?? 0));
}

function catalogVersionKey(date: string): string {
  return `dailyPricesCatalog:${date}`;
}

export async function openDailyPrices(
  catalog: Catalog,
  now = new Date(),
  db: PolleriaDb = getDb(),
): Promise<OpenDailyPricesResult> {
  const date = businessDate(now);
  const updatedAtUtc = now.toISOString();
  return db.transaction("rw", db.dailyPrices, db.meta, async () => {
    const current = await db.dailyPrices.where("businessDate").equals(date).toArray();
    const currentByProduct = new Map(current.map((row) => [row.productId, row]));
    const versionRow = await db.meta.get(catalogVersionKey(date));
    const version = versionRow?.value.updatedAt;

    // Publicar precios en el catálogo reemplaza la hoja del día en curso.
    if (version !== undefined && version !== catalog.updatedAt && current.length > 0) {
      const rows = buildBaseDailyPrices(catalog, date, updatedAtUtc);
      await db.dailyPrices.where("businessDate").equals(date).delete();
      await db.dailyPrices.bulkAdd(rows);
      await db.meta.put({
        key: catalogVersionKey(date),
        value: { updatedAt: catalog.updatedAt },
      });
      return { rows: sortRows(rows, catalog), saved: true, businessDate: date };
    }

    const activeProducts = catalog.products.filter((product) => product.active);
    const missing = activeProducts.filter((product) => {
      const row = currentByProduct.get(product.id);
      return !row || row.unit !== product.unit;
    });

    if (missing.length === 0) {
      if (version === undefined) {
        await db.meta.put({
          key: catalogVersionKey(date),
          value: { updatedAt: catalog.updatedAt },
        });
      }
      return { rows: sortRows(current, catalog), saved: true, businessDate: date };
    }

    const allRows = await db.dailyPrices.toArray();
    const previousDate = allRows
      .map((row) => row.businessDate)
      .filter((value) => value < date)
      .sort()
      .at(-1);
    const previous = previousDate
      ? allRows.filter((row) => row.businessDate === previousDate)
      : [];
    const candidates =
      previous.length > 0
        ? copyDailyPrices(catalog, date, previous, updatedAtUtc)
        : buildBaseDailyPrices(catalog, date, updatedAtUtc);
    const missingIds = new Set(missing.map((product) => product.id));
    const added = candidates.filter((row) => missingIds.has(row.productId));

    await db.dailyPrices.bulkPut(added);
    await db.meta.put({
      key: catalogVersionKey(date),
      value: { updatedAt: catalog.updatedAt },
    });
    const merged = [
      ...current.filter((row) => !missingIds.has(row.productId)),
      ...added,
    ];
    return { rows: sortRows(merged, catalog), saved: true, businessDate: date };
  });
}

export async function saveDailyPriceDrafts(
  catalog: Catalog,
  date: string,
  drafts: readonly DailyPriceDraft[],
  now = new Date(),
  db: PolleriaDb = getDb(),
): Promise<DailyPrice[]> {
  const byProduct = new Map(drafts.map((draft) => [draft.productId, draft]));
  const updatedAtUtc = now.toISOString();
  return db.transaction("rw", db.dailyPrices, async () => {
    const current = await db.dailyPrices.where("businessDate").equals(date).toArray();
    const rows = current.map((row) => {
      const draft = byProduct.get(row.productId);
      if (!draft) return row;
      const normal = parseOptionalPrice(draft.normal);
      if (normal === null) throw new Error("El precio normal es obligatorio");
      return {
        ...row,
        normalPriceCents: normal as Cents,
        promotionPriceCents: parseOptionalPrice(draft.promotion),
        wholesalePriceCents: parseOptionalPrice(draft.wholesale),
        updatedAtUtc,
      };
    });
    await db.dailyPrices.bulkPut(rows);
    return sortRows(rows, catalog);
  });
}
