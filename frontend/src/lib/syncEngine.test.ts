import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { retryFailedOutbox } from "@/lib/syncEngine";
import { drainOutbox } from "@/lib/syncEngine";
import { SyncApiError } from "@/lib/syncApi";
import type { OutboxRecord, TicketWire } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-sync-test-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

function payloadFor(clientOrderUuid: string): TicketWire {
  return {
    schema_version: 1,
    client_order_uuid: clientOrderUuid,
    sold_at_utc: "2026-11-14T18:30:00Z",
    business_date: "2026-11-14",
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
  };
}

function outboxRecord(
  clientOrderUuid: string,
  enqueuedAt: string,
  overrides: Partial<OutboxRecord> = {},
): OutboxRecord {
  return {
    clientOrderUuid,
    schemaVersion: 1,
    status: "pending",
    enqueuedAt,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    payload: payloadFor(clientOrderUuid),
    ...overrides,
  };
}

const NOW = new Date("2026-11-14T12:00:00Z");

describe("drainOutbox", () => {
  it("envía los pendientes en orden, los borra del outbox y resume la pasada", async () => {
    const db = newDb();
    await db.outbox.bulkAdd([
      outboxRecord("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-11-14T10:00:00.000Z"),
      outboxRecord("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-11-14T09:00:00.000Z"),
    ]);
    const sent: string[] = [];

    const summary = await drainOutbox({
      db,
      post: async (payload) => {
        sent.push(payload.client_order_uuid);
      },
      now: () => NOW,
    });

    expect(sent).toEqual([
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    ]);
    expect(summary).toEqual({ synced: 2, retried: 0, failed: 0 });
    expect(await db.outbox.count()).toBe(0);
  });

  it("respeta el tamaño del lote", async () => {
    const db = newDb();
    await db.outbox.bulkAdd([
      outboxRecord("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-11-14T09:00:00.000Z"),
      outboxRecord("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "2026-11-14T10:00:00.000Z"),
    ]);
    const post = vi.fn(async () => undefined);

    const summary = await drainOutbox({ db, post, now: () => NOW, batchSize: 1 });

    expect(summary.synced).toBe(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(await db.outbox.count()).toBe(1);
  });

  it("un fallo de red conserva el ticket y agenda backoff", async () => {
    const db = newDb();
    const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await db.outbox.add(outboxRecord(uuid, "2026-11-14T09:00:00.000Z"));

    const summary = await drainOutbox({
      db,
      post: async () => {
        throw new SyncApiError("NETWORK", "sin red");
      },
      now: () => NOW,
      random: () => 1,
    });

    const record = await db.outbox.get(uuid);
    expect(summary).toEqual({ synced: 0, retried: 1, failed: 0 });
    expect(record?.status).toBe("pending");
    expect(record?.attempts).toBe(1);
    expect(record?.nextAttemptAt).toBe("2026-11-14T12:00:02.000Z");
    expect(record?.lastError).toBe("sin red");
  });

  it("no reintenta antes de la hora agendada", async () => {
    const db = newDb();
    await db.outbox.add(outboxRecord("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "2026-11-14T09:00:00.000Z"));
    const post = vi.fn(async () => {
      throw new SyncApiError("NETWORK", "sin red");
    });

    await drainOutbox({ db, post, now: () => NOW, random: () => 1 });
    await drainOutbox({ db, post, now: () => NOW, random: () => 1 });

    expect(post).toHaveBeenCalledTimes(1);
  });

  it("un 422 pasa a failed y no frena al siguiente ticket", async () => {
    const db = newDb();
    const rejected = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const accepted = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    await db.outbox.bulkAdd([
      outboxRecord(rejected, "2026-11-14T09:00:00.000Z"),
      outboxRecord(accepted, "2026-11-14T10:00:00.000Z"),
    ]);

    const summary = await drainOutbox({
      db,
      post: async (payload) => {
        if (payload.client_order_uuid === rejected) {
          throw new SyncApiError("HTTP", "dato inválido", 422);
        }
      },
      now: () => NOW,
    });

    const record = await db.outbox.get(rejected);
    expect(summary).toEqual({ synced: 1, retried: 0, failed: 1 });
    expect(record?.status).toBe("failed");
    expect(record?.attempts).toBe(1);
    expect(record?.nextAttemptAt).toBeNull();
    expect(await db.outbox.get(accepted)).toBeUndefined();
  });

  it("no vuelve a intentar un fallido en pasadas automáticas", async () => {
    const db = newDb();
    const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await db.outbox.add(outboxRecord(uuid, "2026-11-14T09:00:00.000Z"));
    const post = vi.fn(async () => {
      throw new SyncApiError("HTTP", "dato inválido", 422);
    });

    await drainOutbox({ db, post, now: () => NOW });
    await drainOutbox({ db, post, now: () => NOW });

    expect(post).toHaveBeenCalledTimes(1);
  });

  it("drena un registro legado sin los campos de reintento", async () => {
    const db = newDb();
    const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    // Forma exacta que escribía 002: sin attempts, nextAttemptAt ni lastError.
    await db.outbox.add({
      clientOrderUuid: uuid,
      schemaVersion: 1,
      status: "pending",
      enqueuedAt: "2026-11-14T09:00:00.000Z",
      payload: payloadFor(uuid),
    } as OutboxRecord);

    const summary = await drainOutbox({ db, post: async () => undefined, now: () => NOW });

    expect(summary.synced).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
});

describe("retryFailedOutbox", () => {
  it("devuelve los fallidos a la cola con los contadores en cero", async () => {
    const db = newDb();
    const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await db.outbox.add(
      outboxRecord(uuid, "2026-11-14T09:00:00.000Z", {
        status: "failed",
        attempts: 3,
        lastError: "dato inválido",
      }),
    );

    const count = await retryFailedOutbox(db);

    expect(count).toBe(1);
    expect(await db.outbox.get(uuid)).toMatchObject({
      status: "pending",
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
    });
  });
});
