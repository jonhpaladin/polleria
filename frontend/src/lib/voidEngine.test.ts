import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { SyncApiError } from "@/lib/syncApi";
import { drainVoids } from "@/lib/voidEngine";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-void-test-${counter++}`);
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
  overrides: Partial<LocalTicket> = {},
): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid,
    localFolio: 1,
    soldAtUtc: "2026-11-22T18:00:00Z",
    businessDate: "2026-11-22",
    paymentMethod: "cash",
    lines: [],
    totalCents: 7500 as Cents,
    status: "voided",
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    voidedAtUtc: "2026-11-22T18:05:00Z",
    voidReason: "Cobro incorrecto",
    voidPending: true,
    ...overrides,
  };
}

describe("drainVoids", () => {
  it("sincroniza solo las anulaciones pendientes y limpia el aviso", async () => {
    const db = newDb();
    await db.tickets.bulkAdd([
      ticket("11111111-1111-4111-8111-111111111111"),
      ticket("22222222-2222-4222-8222-222222222222", {
        status: "confirmed",
        voidPending: false,
        voidedAtUtc: null,
        voidReason: null,
      }),
    ]);
    const post = vi.fn(async () => undefined);

    const summary = await drainVoids({ db, post });

    expect(summary).toEqual({ synced: 1, failed: 0, auth: false });
    expect(post).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      "Cobro incorrecto",
    );
    const synced = await db.tickets.get("11111111-1111-4111-8111-111111111111");
    expect(synced?.voidPending).toBe(false);
    expect(synced?.voidLastError).toBeNull();
  });

  it("conserva la anulación pendiente si falta la clave del local", async () => {
    const db = newDb();
    await db.tickets.add(ticket("11111111-1111-4111-8111-111111111111"));
    const post = vi.fn(async () => {
      throw new SyncApiError("HTTP", "clave inválida", 401);
    });

    const summary = await drainVoids({ db, post });

    expect(summary).toEqual({ synced: 0, failed: 0, auth: true });
    const pending = await db.tickets.get("11111111-1111-4111-8111-111111111111");
    expect(pending?.voidPending).toBe(true);
    expect(pending?.voidLastError).toBe("clave inválida");
  });
});
