import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { openDailyPrices, saveDailyPriceDrafts } from "@/lib/dailyPriceRepository";
import { makeCatalog } from "@/test/fixtures";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-daily-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

describe("openDailyPrices", () => {
  it("crea la hoja del día desde el catálogo si no hay ninguna anterior", async () => {
    const db = newDb();
    const catalog = makeCatalog();

    const result = await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);

    expect(result.businessDate).toBe("2026-11-13");
    expect(result.saved).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(await db.dailyPrices.count()).toBe(2);
  });

  it("copia la última hoja anterior disponible, no el día calendario anterior", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    await db.dailyPrices.bulkPut([
      {
        id: "2026-11-10:prd-pierna",
        businessDate: "2026-11-10",
        productId: "prd-pierna",
        unit: "kg",
        normalPriceCents: 13000 as never,
        promotionPriceCents: null,
        wholesalePriceCents: null,
        updatedAtUtc: "2026-11-10T15:00:00.000Z",
      },
      {
        id: "2026-11-11:prd-pierna",
        businessDate: "2026-11-11",
        productId: "prd-pierna",
        unit: "kg",
        normalPriceCents: 13500 as never,
        promotionPriceCents: null,
        wholesalePriceCents: null,
        updatedAtUtc: "2026-11-11T15:00:00.000Z",
      },
    ]);

    const result = await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);
    const pierna = result.rows.find((row) => row.productId === "prd-pierna");

    expect(pierna?.normalPriceCents).toBe(13500);
    expect(pierna?.promotionPriceCents).toBeNull();
    expect(result.rows.find((row) => row.productId === "prd-combo")?.normalPriceCents).toBe(29900);
  });

  it("no sobreescribe una hoja del día ya editada", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);
    await saveDailyPriceDrafts(
      catalog,
      "2026-11-13",
      [
        {
          productId: "prd-pierna",
          normal: "160.00",
          promotion: "",
          wholesale: "",
        },
      ],
      new Date("2026-11-13T19:00:00Z"),
      db,
    );

    const second = await openDailyPrices(catalog, new Date("2026-11-13T20:00:00Z"), db);

    expect(second.rows.find((row) => row.productId === "prd-pierna")?.normalPriceCents).toBe(16000);
  });

  it("conserva la hoja después de reescribir el catálogo", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);

    await db.products.clear();
    await db.products.bulkAdd(catalog.products);

    const result = await openDailyPrices(catalog, new Date("2026-11-13T19:00:00Z"), db);
    expect(result.rows).toHaveLength(2);
  });

  it("agrega un producto nuevo sin tocar los precios ya editados del día", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    const now = new Date("2026-11-13T18:00:00Z");
    await openDailyPrices(catalog, now, db);
    await saveDailyPriceDrafts(
      catalog,
      "2026-11-13",
      [{ productId: "prd-pierna", normal: "160.00", promotion: "", wholesale: "" }],
      now,
      db,
    );

    const pierna = catalog.products.find((product) => product.id === "prd-pierna")!;
    catalog.products = [
      ...catalog.products,
      { ...pierna, id: "prd-pechuga", sku: "PECHUGA", name: "Pechuga" },
    ];

    const result = await openDailyPrices(catalog, new Date("2026-11-13T20:00:00Z"), db);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.find((row) => row.productId === "prd-pierna")?.normalPriceCents).toBe(16000);
    expect(result.rows.find((row) => row.productId === "prd-pechuga")?.normalPriceCents).toBe(15000);
  });
});

describe("saveDailyPriceDrafts", () => {
  it("guarda normal, promoción y mayoreo y deja vacíos como null", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);

    const rows = await saveDailyPriceDrafts(
      catalog,
      "2026-11-13",
      [
        {
          productId: "prd-pierna",
          normal: "155.50",
          promotion: "140.00",
          wholesale: "145.00",
        },
      ],
      new Date("2026-11-13T19:00:00Z"),
      db,
    );

    expect(rows.find((row) => row.productId === "prd-pierna")).toMatchObject({
      normalPriceCents: 15550,
      promotionPriceCents: 14000,
      wholesalePriceCents: 14500,
    });

    const cleared = await saveDailyPriceDrafts(
      catalog,
      "2026-11-13",
      [{ productId: "prd-pierna", normal: "155.50", promotion: "", wholesale: "" }],
      new Date("2026-11-13T19:30:00Z"),
      db,
    );

    expect(cleared.find((row) => row.productId === "prd-pierna")).toMatchObject({
      promotionPriceCents: null,
      wholesalePriceCents: null,
    });
  });

  it("rechaza un precio normal vacío sin guardar cambios", async () => {
    const db = newDb();
    const catalog = makeCatalog();
    await openDailyPrices(catalog, new Date("2026-11-13T18:00:00Z"), db);

    await expect(
      saveDailyPriceDrafts(
        catalog,
        "2026-11-13",
        [{ productId: "prd-pierna", normal: "", promotion: "", wholesale: "" }],
        new Date("2026-11-13T19:00:00Z"),
        db,
      ),
    ).rejects.toThrow("obligatorio");

    const rows = await db.dailyPrices.toArray();
    expect(rows.find((row) => row.productId === "prd-pierna")?.normalPriceCents).toBe(15000);
  });
});
