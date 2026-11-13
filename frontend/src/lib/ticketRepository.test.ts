import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { persistTicket } from "@/lib/ticketRepository";
import { makeCatalog } from "@/test/fixtures";
import type { Cents } from "@/types/catalog";
import type { CartState } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-ticket-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function cart(): CartState {
  return {
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
  };
}

describe("persistTicket", () => {
  it("guarda ticket y outbox en la misma transacción con folio incremental", async () => {
    const db = newDb();
    const now = new Date("2026-11-13T18:00:00Z");

    const first = await persistTicket(cart(), makeCatalog().updatedAt, now, "11111111-1111-4111-8111-111111111111", db);
    const second = await persistTicket(cart(), makeCatalog().updatedAt, now, "22222222-2222-4222-8222-222222222222", db);

    expect(first.ticket.localFolio).toBe(1);
    expect(second.ticket.localFolio).toBe(2);
    expect(first.outbox.status).toBe("pending");
    expect(first.outbox.payload.total).toBe("75.00");
    expect(await db.tickets.count()).toBe(2);
    expect(await db.outbox.count()).toBe(2);
  });

  it("es idempotente: el mismo UUID no duplica el cobro", async () => {
    const db = newDb();
    const now = new Date("2026-11-13T18:00:00Z");

    const first = await persistTicket(cart(), makeCatalog().updatedAt, now, "11111111-1111-4111-8111-111111111111", db);
    const again = await persistTicket(cart(), makeCatalog().updatedAt, now, "11111111-1111-4111-8111-111111111111", db);

    expect(again.ticket.localFolio).toBe(first.ticket.localFolio);
    expect(await db.tickets.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
  });

  it("el ticket guardado es inmutable ante cambios posteriores del carrito", async () => {
    const db = newDb();
    const source = cart();

    const result = await persistTicket(source, makeCatalog().updatedAt, new Date(), "11111111-1111-4111-8111-111111111111", db);
    source.lines[0]!.lineTotalCents = 1 as Cents;

    expect((await db.tickets.get("11111111-1111-4111-8111-111111111111"))?.totalCents).toBe(7500);
    expect(result.ticket.totalCents).toBe(7500);
  });

  it("un fallo al escribir el outbox no deja ticket huérfano ni consume folio", async () => {
    const db = newDb();
    const spy = vi.spyOn(db.outbox, "add").mockRejectedValueOnce(new Error("Cuota excedida"));

    await expect(
      persistTicket(
        cart(),
        makeCatalog().updatedAt,
        new Date("2026-11-13T18:00:00Z"),
        "11111111-1111-4111-8111-111111111111",
        db,
      ),
    ).rejects.toThrow();
    spy.mockRestore();

    expect(await db.tickets.count()).toBe(0);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.meta.get("ticket-sequence")).toBeUndefined();
  });

  it("el ticket confirmado sobrevive una reapertura de la base", async () => {
    const db = newDb();
    const name = db.name;
    const result = await persistTicket(
      cart(),
      makeCatalog().updatedAt,
      new Date("2026-11-13T18:00:00Z"),
      "11111111-1111-4111-8111-111111111111",
      db,
    );
    db.close();

    const reopened = createDb(name);
    openDbs.push(reopened);

    expect((await reopened.tickets.get(result.ticket.clientOrderUuid))?.totalCents).toBe(7500);
    expect((await reopened.outbox.get(result.ticket.clientOrderUuid))?.status).toBe("pending");
  });
});
