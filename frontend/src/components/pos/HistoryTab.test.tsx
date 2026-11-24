import Dexie from "dexie";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HistoryTab } from "@/components/pos/HistoryTab";
import { businessDate } from "@/lib/dailyPrices";
import { createDb, type PolleriaDb } from "@/lib/db";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-history-ui-${counter++}`);
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
  uuid: string,
  folio: number,
  status: LocalTicket["status"] = "confirmed",
): LocalTicket {
  const today = businessDate(new Date());
  return {
    schemaVersion: 1,
    clientOrderUuid: uuid,
    localFolio: folio,
    soldAtUtc: new Date().toISOString(),
    businessDate: today,
    paymentMethod: "cash",
    lines: [
      {
        lineId: `line-${folio}`,
        productId: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        categoryName: "Pollo crudo",
        unit: "kg",
        quantity: 1,
        grams: 500 as never,
        priceSource: "lista",
        catalogUnitPriceCents: 10000 as Cents,
        unitPriceCents: 10000 as Cents,
        lineTotalCents: 5000 as Cents,
      },
    ],
    totalCents: 5000 as Cents,
    status,
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    ...(status === "voided"
      ? {
          voidedAtUtc: new Date().toISOString(),
          voidReason: "Cobro incorrecto",
          voidPending: false,
        }
      : {}),
  };
}

describe("HistoryTab", () => {
  it("lista las ventas de hoy y filtra por folio", async () => {
    const db = newDb();
    await db.tickets.bulkAdd([
      ticket("11111111-1111-4111-8111-111111111111", 1),
      ticket("22222222-2222-4222-8222-222222222222", 2, "voided"),
    ]);

    render(<HistoryTab db={db} />);

    expect(await screen.findByText("Folio #1")).toBeInTheDocument();
    expect(screen.getByText("Folio #2")).toBeInTheDocument();
    expect(screen.getByText("Anulada")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar folio"), {
      target: { value: "2" },
    });

    expect(screen.queryByText("Folio #1")).not.toBeInTheDocument();
    expect(screen.getByText("Folio #2")).toBeInTheDocument();
  });
});
