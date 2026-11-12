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
