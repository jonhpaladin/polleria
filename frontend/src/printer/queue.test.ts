import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import {
  claimNextPrintJob,
  enqueuePrintJob,
  listAttentionPrintJobs,
  markPrinted,
  markUncertain,
  printQueueCounts,
  recoverInterruptedPrintJobs,
  retryPrintJob,
} from "@/printer/queue";
import { toPrintTicket } from "@/printer/ticket";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-print-queue-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function ticket(uuid = "11111111-1111-4111-8111-111111111111"): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid: uuid,
    localFolio: 7,
    soldAtUtc: "2026-11-25T18:45:00.000Z",
    businessDate: "2026-11-25",
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
    catalogUpdatedAt: "2026-11-25T18:00:00.000Z",
  };
}

describe("cola de impresión", () => {
  it("deduplica la impresión de venta y permite una reimpresión", async () => {
    const db = newDb();
    const model = toPrintTicket(ticket());

    const first = await enqueuePrintJob(model, "sale", { db });
    const duplicate = await enqueuePrintJob(model, "sale", { db });
    const reprint = await enqueuePrintJob(model, "reprint", { db });

    expect(duplicate.id).toBe(first.id);
    expect(reprint.id).not.toBe(first.id);
    expect(await db.printJobs.count()).toBe(2);
  });

  it("reclama el pendiente más viejo y cuenta estados", async () => {
    const db = newDb();
    const model = toPrintTicket(ticket());

    await enqueuePrintJob(model, "sale", { db });
    const claimed = await claimNextPrintJob(db);

    expect(claimed?.status).toBe("printing");
    expect(claimed?.attempts).toBe(1);
    expect(await printQueueCounts(db)).toEqual({ pending: 0, failed: 0, uncertain: 0 });

    await markPrinted(db, claimed!);
    expect((await db.printJobs.get(claimed!.id!))?.status).toBe("printed");
  });

  it("no reintenta solo un trabajo incierto", async () => {
    const db = newDb();
    const model = toPrintTicket(ticket());

    await enqueuePrintJob(model, "sale", { db });
    const claimed = await claimNextPrintJob(db);
    await markUncertain(db, claimed!, "Se desconectó");

    expect(await printQueueCounts(db)).toEqual({ pending: 0, failed: 0, uncertain: 1 });
    expect((await listAttentionPrintJobs(db))[0]?.status).toBe("uncertain");
    expect(await claimNextPrintJob(db)).toBeNull();

    await retryPrintJob(db, claimed!.id!);
    expect(await printQueueCounts(db)).toEqual({ pending: 1, failed: 0, uncertain: 0 });
  });

  it("convierte impresiones interrumpidas en inciertas al iniciar", async () => {
    const db = newDb();
    const model = toPrintTicket(ticket());

    await enqueuePrintJob(model, "sale", { db });
    await claimNextPrintJob(db);

    expect(await recoverInterruptedPrintJobs(db)).toBe(1);
    expect(await printQueueCounts(db)).toEqual({ pending: 0, failed: 0, uncertain: 1 });
  });
});
