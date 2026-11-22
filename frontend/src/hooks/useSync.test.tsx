import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSync, type UseSyncOptions } from "@/hooks/useSync";
import { createDb, type PolleriaDb } from "@/lib/db";
import { SyncApiError } from "@/lib/syncApi";
import type { OutboxRecord, TicketWire } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-use-sync-test-${counter++}`);
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

const UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function outboxRecord(overrides: Partial<OutboxRecord> = {}): OutboxRecord {
  return {
    clientOrderUuid: UUID,
    schemaVersion: 1,
    status: "pending",
    enqueuedAt: "2026-11-14T09:00:00.000Z",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    payload: payloadFor(UUID),
    ...overrides,
  };
}

function Harness(props: UseSyncOptions) {
  const sync = useSync(props);
  return (
    <>
      <p data-testid="state">{`${sync.pending}|${sync.failed}|${sync.syncing}`}</p>
      <p data-testid="error">{sync.lastError ?? ""}</p>
      <button type="button" onClick={() => void sync.retryFailed()}>
        Reintentar
      </button>
    </>
  );
}

describe("useSync", () => {
  it("drena al montar y deja el contador en cero", async () => {
    const db = newDb();
    await db.outbox.add(outboxRecord());
    const post = vi.fn(async () => ({ status: "created" }));

    render(<Harness online db={db} post={post} pollMs={60_000} />);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("0|0|false"),
    );
  });

  it("sin conexión no intenta enviar y conserva el pendiente", async () => {
    const db = newDb();
    await db.outbox.add(outboxRecord());
    const post = vi.fn(async () => ({ status: "created" }));

    render(<Harness online={false} db={db} post={post} pollMs={60_000} />);

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("1|0|false"),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("drena al recuperar la conexión", async () => {
    const db = newDb();
    await db.outbox.add(outboxRecord());
    const post = vi.fn(async () => ({ status: "created" }));

    const { rerender } = render(
      <Harness online={false} db={db} post={post} pollMs={60_000} />,
    );
    rerender(<Harness online db={db} post={post} pollMs={60_000} />);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("0|0|false"),
    );
  });

  it("un fallo recuperable mantiene la venta pendiente y avisa del reintento", async () => {
    const db = newDb();
    await db.outbox.add(outboxRecord());
    const post = vi.fn(async () => {
      throw new SyncApiError("NETWORK", "sin red");
    });

    render(<Harness online db={db} post={post} pollMs={60_000} />);

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("1|0|false"),
    );
    expect(screen.getByTestId("error")).toHaveTextContent("se reintentará solo");
  });

  it("reintentar devuelve el fallido a la cola y lo envía", async () => {
    const db = newDb();
    await db.outbox.add(
      outboxRecord({ status: "failed", attempts: 2, lastError: "dato inválido" }),
    );
    const post = vi.fn(async () => ({ status: "created" }));

    render(<Harness online db={db} post={post} pollMs={60_000} />);
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("0|1|false"),
    );

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("0|0|false"),
    );
  });
});
