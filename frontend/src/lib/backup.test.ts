import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  backupFileName,
  buildBackup,
  restoreBackup,
  validateBackup,
} from "@/lib/backup";
import { createDb, type PolleriaDb } from "@/lib/db";
import type { Cents } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CashCut } from "@/types/report";
import type { LocalTicket, OutboxRecord } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-backup-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  localStorage.clear();
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function ticket(clientOrderUuid: string, overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid,
    localFolio: 1,
    soldAtUtc: "2026-11-22T18:00:00Z",
    businessDate: "2026-11-22",
    paymentMethod: "cash",
    lines: [
      {
        lineId: "line-1",
        productId: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        categoryName: "Pollo",
        unit: "kg",
        quantity: 1,
        grams: 500 as never,
        priceSource: "lista",
        catalogUnitPriceCents: 15000 as Cents,
        unitPriceCents: 15000 as Cents,
        lineTotalCents: 7500 as Cents,
      },
    ],
    totalCents: 7500 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    ...overrides,
  };
}

function outbox(clientOrderUuid: string): OutboxRecord {
  return {
    clientOrderUuid,
    schemaVersion: 1,
    status: "pending",
    enqueuedAt: "2026-11-22T18:00:00.000Z",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    payload: {
      schema_version: 1,
      client_order_uuid: clientOrderUuid,
      sold_at_utc: "2026-11-22T18:00:00Z",
      business_date: "2026-11-22",
      payment_method: "cash",
      lines: [
        {
          line_id: "line-1",
          product_id: "prd-pierna",
          sku: "PIERNA-MUSLO",
          name: "Pierna y muslo",
          category_name: "Pollo",
          unit: "kg",
          quantity: 1,
          grams: 500,
          price_source: "lista",
          catalog_unit_price: "150.00",
          unit_price: "150.00",
          line_total: "75.00",
        },
      ],
      total: "75.00",
      catalog_updated_at: "2026-11-11T18:04:00Z",
    },
  };
}

function cut(businessDate: string): CashCut {
  return {
    businessDate,
    openingCashCents: 0 as Cents,
    countedCashCents: 0 as Cents,
    expectedCashCents: 0 as Cents,
    differenceCents: 0,
    ticketCount: 1,
    totalCents: 7500 as Cents,
    byPayment: { cash: 7500 as Cents, card: 0 as Cents, transfer: 0 as Cents },
    closedAtUtc: `${businessDate}T23:00:00.000Z`,
    recalculatedAtUtc: null,
  };
}

function dailyPrice(date: string, productId: string): DailyPrice {
  return {
    id: `${date}:${productId}`,
    businessDate: date,
    productId,
    unit: "kg",
    normalPriceCents: 15000 as Cents,
    promotionPriceCents: null,
    wholesalePriceCents: null,
    updatedAtUtc: `${date}T18:00:00.000Z`,
  };
}

describe("buildBackup", () => {
  it("respalda solo los datos transaccionales y calcula el último folio", async () => {
    const db = newDb();
    await db.tickets.bulkAdd([ticket("11111111-1111-4111-8111-111111111111", { localFolio: 3 })]);
    await db.outbox.add(outbox("11111111-1111-4111-8111-111111111111"));
    await db.cashCuts.add(cut("2026-11-22"));
    await db.dailyPrices.add(dailyPrice("2026-11-22", "prd-pierna"));
    await db.meta.put({ key: "ticket-sequence", value: { updatedAt: "", localFolio: 12 } });
    await db.categories.add({ id: "cat-pollo", name: "Pollo", sortOrder: 1 });

    const backup = await buildBackup(db, new Date("2026-11-23T10:00:00Z"));

    expect(backup.counts).toEqual({ tickets: 1, outbox: 1, cashCuts: 1, dailyPrices: 1 });
    expect(backup.lastLocalFolio).toBe(12);
    expect(backup.tickets).toHaveLength(1);
    expect(Object.keys(backup)).not.toContain("categories");
    expect(backupFileName(new Date("2026-11-23T10:00:00Z"))).toBe(
      "polleria-respaldo-2026-11-23.json",
    );
  });
});

describe("validateBackup", () => {
  it("acepta un respaldo generado por la app", async () => {
    const db = newDb();
    await db.tickets.add(ticket("11111111-1111-4111-8111-111111111111"));
    const backup = await buildBackup(db);

    const checked = validateBackup(backup);

    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.backup.counts.tickets).toBe(1);
  });

  it("rechaza otro formato o una versión distinta", async () => {
    expect(validateBackup({ format: "otra-cosa", version: 1 }).ok).toBe(false);
    expect(validateBackup({ format: "polleria-backup", version: 99 }).ok).toBe(false);
  });

  it("rechaza un ticket con total inválido", async () => {
    const db = newDb();
    await db.tickets.add(ticket("11111111-1111-4111-8111-111111111111"));
    const backup = await buildBackup(db);
    const first = backup.tickets[0];
    if (!first) throw new Error("sin ticket");

    const checked = validateBackup({
      ...backup,
      tickets: [{ ...first, totalCents: 0 }],
    });

    expect(checked.ok).toBe(false);
  });

  it("recalcula el último folio si el archivo no lo trae", async () => {
    const db = newDb();
    await db.tickets.add(ticket("11111111-1111-4111-8111-111111111111", { localFolio: 27 }));
    const raw = JSON.parse(JSON.stringify(await buildBackup(db))) as Record<string, unknown>;
    delete raw.lastLocalFolio;

    const checked = validateBackup(raw);

    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.backup.lastLocalFolio).toBe(27);
  });
});

describe("restoreBackup", () => {
  it("agrega todo en una base vacía y no duplica al repetir", async () => {
    const source = newDb();
    await source.tickets.add(ticket("11111111-1111-4111-8111-111111111111", { localFolio: 4 }));
    await source.outbox.add(outbox("11111111-1111-4111-8111-111111111111"));
    await source.cashCuts.add(cut("2026-11-22"));
    await source.dailyPrices.add(dailyPrice("2026-11-22", "prd-pierna"));
    const backup = await buildBackup(source);

    const target = newDb();
    const first = await restoreBackup(target, backup);
    const second = await restoreBackup(target, backup);

    expect(first.tickets).toEqual({ added: 1, skipped: 0 });
    expect(first.cashCuts).toEqual({ added: 1, skipped: 0 });
    expect(second.tickets).toEqual({ added: 0, skipped: 1 });
    expect(second.cashCuts).toEqual({ added: 0, skipped: 1 });
    expect(await target.tickets.count()).toBe(1);
    expect(first.lastLocalFolio).toBe(4);
    expect((await target.meta.get("ticket-sequence"))?.value.localFolio).toBe(4);
  });

  it("conserva el ticket que ya existe en el dispositivo", async () => {
    const source = newDb();
    await source.tickets.add(ticket("11111111-1111-4111-8111-111111111111", { totalCents: 7500 as Cents }));
    const backup = await buildBackup(source);

    const target = newDb();
    await target.tickets.add(ticket("11111111-1111-4111-8111-111111111111", { totalCents: 9999 as Cents }));

    const result = await restoreBackup(target, backup);

    expect(result.tickets).toEqual({ added: 0, skipped: 1 });
    expect((await target.tickets.get("11111111-1111-4111-8111-111111111111"))?.totalCents).toBe(9999);
  });
});
