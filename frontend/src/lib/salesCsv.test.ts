import { describe, expect, it } from "vitest";

import { buildSalesCsv, salesCsvFileName } from "@/lib/salesCsv";
import type { Cents } from "@/types/catalog";
import type { CartLine, LocalTicket } from "@/types/sale";

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    lineId: "line-1",
    productId: "prd-pierna",
    sku: "PIERNA-MUSLO",
    name: 'Pollo "especial"',
    categoryName: "Pollo crudo",
    unit: "kg",
    quantity: 1,
    grams: 500 as never,
    priceSource: "lista",
    catalogUnitPriceCents: 10000 as Cents,
    unitPriceCents: 9900 as Cents,
    lineTotalCents: 4950 as Cents,
    ...overrides,
  };
}

function ticket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid: "11111111-1111-4111-8111-111111111111",
    localFolio: 7,
    soldAtUtc: "2026-11-22T18:30:00Z",
    businessDate: "2026-11-22",
    paymentMethod: "cash",
    lines: [line()],
    totalCents: 4950 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    ...overrides,
  };
}

describe("buildSalesCsv", () => {
  it("incluye encabezado, BOM y una fila por línea con decimales", () => {
    const csv = buildSalesCsv([ticket()]);
    const rows = csv.split("\r\n");

    expect(csv.startsWith('\uFEFF"folio"')).toBe(true);
    expect(rows[0]).toContain('"motivo_anulacion"');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('"7"');
    expect(rows[1]).toContain('"PIERNA-MUSLO"');
    expect(rows[1]).toContain('"99.00"');
    expect(rows[1]).toContain('"49.50"');
    expect(rows[1]).toContain('"500"');
  });

  it("escapa comillas y conserva el motivo de una venta anulada", () => {
    const csv = buildSalesCsv([
      ticket({
        status: "voided",
        voidReason: 'Cliente "canceló"',
        voidedAtUtc: "2026-11-22T19:00:00Z",
      }),
    ]);

    expect(csv).toContain('"Pollo ""especial"""');
    expect(csv).toContain('"Cliente ""canceló"""');
    expect(csv).toContain('"voided"');
  });

  it("devuelve solo el encabezado cuando no hay ventas", () => {
    const csv = buildSalesCsv([]);
    const rows = csv.split("\r\n");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('"folio"');
    expect(rows[1]).toBe("");
  });
});

describe("salesCsvFileName", () => {
  it("nombra por día o por rango", () => {
    expect(salesCsvFileName("2026-11-22", "2026-11-22")).toBe(
      "polleria-ventas-2026-11-22.csv",
    );
    expect(salesCsvFileName("2026-11-01", "2026-11-22")).toBe(
      "polleria-ventas-2026-11-01_2026-11-22.csv",
    );
  });
});
