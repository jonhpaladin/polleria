import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import {
  filterTicketsByFolio,
  listTicketsBetween,
  summarizeTickets,
} from "@/lib/historyRepository";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-history-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function ticket(
  clientOrderUuid: string,
  businessDate: string,
  localFolio: number,
  totalCents: number,
  status: LocalTicket["status"] = "confirmed",
): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid,
    localFolio,
    soldAtUtc: `${businessDate}T18:00:00Z`,
    businessDate,
    paymentMethod: "cash",
    lines: [],
    totalCents: totalCents as Cents,
    status,
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    ...(status === "voided"
      ? {
          voidedAtUtc: `${businessDate}T19:00:00Z`,
          voidReason: "Cobro incorrecto",
          voidPending: false,
        }
      : {}),
  };
}

describe("listTicketsBetween", () => {
  it("incluye los extremos y ordena por fecha y folio descendente", async () => {
    const db = newDb();
    await db.tickets.bulkAdd([
      ticket("11111111-1111-4111-8111-111111111111", "2026-11-20", 1, 10000),
      ticket("22222222-2222-4222-8222-222222222222", "2026-11-21", 2, 20000),
      ticket("33333333-3333-4333-8333-333333333333", "2026-11-22", 3, 30000),
      ticket("44444444-4444-4444-8444-444444444444", "2026-11-22", 4, 40000, "voided"),
    ]);

    const result = await listTicketsBetween(db, "2026-11-21", "2026-11-22");

    expect(result.map((item) => item.localFolio)).toEqual([4, 3, 2]);
  });
});

describe("filterTicketsByFolio", () => {
  it("filtra por cualquier parte del folio y deja todo si está vacío", () => {
    const tickets = [
      ticket("11111111-1111-4111-8111-111111111111", "2026-11-22", 1, 10000),
      ticket("22222222-2222-4222-8222-222222222222", "2026-11-22", 12, 20000),
    ];

    expect(filterTicketsByFolio(tickets, "")).toHaveLength(2);
    expect(filterTicketsByFolio(tickets, "2").map((item) => item.localFolio)).toEqual([12]);
    expect(filterTicketsByFolio(tickets, "1").map((item) => item.localFolio)).toEqual([1, 12]);
  });
});

describe("summarizeTickets", () => {
  it("separa ventas activas y anuladas", () => {
    const summary = summarizeTickets([
      ticket("11111111-1111-4111-8111-111111111111", "2026-11-22", 1, 10000),
      ticket("22222222-2222-4222-8222-222222222222", "2026-11-22", 2, 20000),
      ticket("33333333-3333-4333-8333-333333333333", "2026-11-22", 3, 5000, "voided"),
    ]);

    expect(summary.ticketCount).toBe(3);
    expect(summary.activeTotalCents).toBe(30000);
    expect(summary.voidedCount).toBe(1);
    expect(summary.voidedTotalCents).toBe(5000);
  });
});
