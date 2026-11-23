import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import {
  countUnsyncedTickets,
  listCashCuts,
  listTicketsByBusinessDate,
  readCashCut,
  saveCashCut,
} from "@/lib/reportRepository";
import type { Cents } from "@/types/catalog";
import type { CashCut } from "@/types/report";
import type { LocalTicket, OutboxRecord } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-report-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function ticket(clientOrderUuid: string, businessDate: string): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid,
    localFolio: 1,
    soldAtUtc: "2026-11-22T18:00:00Z",
    businessDate,
    paymentMethod: "cash",
    lines: [],
    totalCents: 0 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
  };
}

function outbox(
  clientOrderUuid: string,
  businessDate: string,
  status: OutboxRecord["status"],
): OutboxRecord {
  return {
    clientOrderUuid,
    schemaVersion: 1,
    status,
    enqueuedAt: "2026-11-22T18:00:00.000Z",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    payload: {
      schema_version: 1,
      client_order_uuid: clientOrderUuid,
      sold_at_utc: "2026-11-22T18:00:00Z",
      business_date: businessDate,
      payment_method: "cash",
      lines: [],
      total: "0.00",
      catalog_updated_at: "2026-11-11T18:04:00Z",
    },
  };
}

function cut(businessDate: string, totalCents: number, differenceCents: number): CashCut {
  return {
    businessDate,
    openingCashCents: 0 as Cents,
    countedCashCents: 0 as Cents,
    expectedCashCents: 0 as Cents,
    differenceCents,
    ticketCount: 1,
    totalCents: totalCents as Cents,
    byPayment: { cash: totalCents as Cents, card: 0 as Cents, transfer: 0 as Cents },
    closedAtUtc: `${businessDate}T23:00:00.000Z`,
    recalculatedAtUtc: null,
  };
}

describe("reportRepository", () => {
  it("lista solo los tickets del día pedido", async () => {
    const db = newDb();
    await db.tickets.bulkAdd([
      ticket("11111111-1111-4111-8111-111111111111", "2026-11-22"),
      ticket("22222222-2222-4222-8222-222222222222", "2026-11-21"),
    ]);

    const result = await listTicketsByBusinessDate(db, "2026-11-22");

    expect(result.map((item) => item.clientOrderUuid)).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("guarda y relee el corte del día", async () => {
    const db = newDb();
    const record = cut("2026-11-22", 64175, -4000);

    await saveCashCut(db, record);

    expect(await readCashCut(db, "2026-11-22")).toEqual(record);
    expect(await readCashCut(db, "2026-11-21")).toBeUndefined();
  });

  it("ordena el historial del más reciente al más viejo y respeta el límite", async () => {
    const db = newDb();
    await db.cashCuts.bulkAdd([
      cut("2026-11-20", 100, 0),
      cut("2026-11-22", 300, 0),
      cut("2026-11-21", 200, 0),
    ]);

    expect((await listCashCuts(db)).map((item) => item.businessDate)).toEqual([
      "2026-11-22",
      "2026-11-21",
      "2026-11-20",
    ]);
    expect((await listCashCuts(db, 2)).map((item) => item.businessDate)).toEqual([
      "2026-11-22",
      "2026-11-21",
    ]);
  });

  it("cuenta pending y failed del día, sin mezclar otros días", async () => {
    const db = newDb();
    await db.outbox.bulkAdd([
      outbox("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-11-22", "pending"),
      outbox("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-11-22", "pending"),
      outbox("cccccccc-cccc-4ccc-8ccc-cccccccccccc", "2026-11-22", "failed"),
      outbox("dddddddd-dddd-4ddd-8ddd-dddddddddddd", "2026-11-21", "pending"),
    ]);

    expect(await countUnsyncedTickets(db, "2026-11-22")).toBe(3);
    expect(await countUnsyncedTickets(db, "2026-11-21")).toBe(1);
    expect(await countUnsyncedTickets(db, "2026-11-20")).toBe(0);
  });
});
