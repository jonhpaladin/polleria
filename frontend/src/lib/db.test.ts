import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { makeCatalog } from "@/test/fixtures";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-db-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

describe("Dexie v1", () => {
  it("abre la base, inserta y relee categorías, productos y meta", async () => {
    const db = newDb();
    const catalog = makeCatalog();

    await db.categories.bulkAdd(catalog.categories);
    await db.products.bulkAdd(catalog.products);
    await db.meta.put({ key: "catalog", value: { updatedAt: catalog.updatedAt } });

    expect(await db.categories.count()).toBe(3);
    expect(await db.products.count()).toBe(2);
    expect((await db.meta.get("catalog"))?.value.updatedAt).toBe(catalog.updatedAt);
  });

  it("rechaza un sku duplicado", async () => {
    const db = newDb();
    const product = makeCatalog().products[0]!;

    await db.products.add(product);

    await expect(db.products.add({ ...product, id: "prd-otro" })).rejects.toThrow();
  });
});

describe("Dexie v1 → v2", () => {
  it("conserva catálogo y meta y agrega precios, tickets y outbox", async () => {
    const name = `polleria-migration-test-${counter++}`;
    const catalog = makeCatalog();

    const v1 = new Dexie(name);
    v1.version(1).stores({
      categories: "id, sortOrder",
      products: "id, &sku, categoryId",
      meta: "key",
    });
    await v1.open();
    await v1.table("categories").bulkAdd(catalog.categories);
    await v1.table("products").bulkAdd(catalog.products);
    await v1.table("meta").put({ key: "catalog", value: { updatedAt: catalog.updatedAt } });
    v1.close();

    const db = createDb(name);
    openDbs.push(db);
    await db.open();

    expect(await db.categories.count()).toBe(3);
    expect(await db.products.count()).toBe(2);
    expect((await db.meta.get("catalog"))?.value.updatedAt).toBe(catalog.updatedAt);
    expect(await db.dailyPrices.count()).toBe(0);
    expect(await db.tickets.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(db.verno).toBe(2);
  });
});
