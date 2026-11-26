import { describe, expect, it } from "vitest";

import { buildDiagnosticBytes, buildTicket } from "@/printer/encoder";
import { fitColumns, formatPrintLine, toPrintTicket } from "@/printer/ticket";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

function sampleTicket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid: "11111111-1111-4111-8111-111111111111",
    localFolio: 42,
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
      {
        lineId: "line-2",
        productId: "prd-empanada",
        sku: "EMPANADA",
        name: "Empanada de champiñón y queso",
        categoryName: "Preparados",
        unit: "piece",
        quantity: 2,
        grams: null,
        priceSource: "lista",
        catalogUnitPriceCents: 10000 as Cents,
        unitPriceCents: 10000 as Cents,
        lineTotalCents: 20000 as Cents,
      },
    ],
    totalCents: 27500 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-25T18:00:00.000Z",
    ...overrides,
  };
}

function ascii(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

describe("ticket de impresión", () => {
  it("convierte el snapshot sin floats y con etiquetas de peso/pieza", () => {
    const model = toPrintTicket(sampleTicket());

    expect(model.lines[0]).toMatchObject({ quantityLabel: "0.500 kg", grams: 500 });
    expect(model.lines[1]).toMatchObject({ quantityLabel: "2 pza", grams: null });
    expect(model.totalCents).toBe(27500);
    expect(model.status).toBe("confirmed");
  });

  it("ajusta las columnas a 32 caracteres y conserva el importe a la derecha", () => {
    const line = fitColumns("2 Empanada de champiñón y queso", "$200.00");

    expect(line).toHaveLength(32);
    expect(line.endsWith("$200.00")).toBe(true);
  });

  it("recorta nombres largos sin desbordar", () => {
    const line = formatPrintLine(
      {
        name: "Empanada de champiñón y queso con salsa",
        unit: "piece",
        quantity: 1,
        grams: null,
        quantityLabel: "1 pza",
        unitPriceCents: 10000 as Cents,
        lineTotalCents: 10000 as Cents,
      },
      32,
    );

    expect(line).toHaveLength(32);
    expect(line).toContain("...");
    expect(line.endsWith("$100.00")).toBe(true);
  });

  it("genera ESC/POS con encabezado, folio y total", () => {
    const bytes = buildTicket(toPrintTicket(sampleTicket()));
    const text = ascii(bytes);

    expect(bytes.length).toBeGreaterThan(100);
    expect(text).toContain("POLLER");
    expect(text).toContain("Folio #42");
    expect(text).toContain("TOTAL");
  });

  it("marca un ticket anulado", () => {
    const bytes = buildTicket(
      toPrintTicket(sampleTicket({ status: "voided", voidReason: "Cobro incorrecto" })),
    );

    expect(ascii(bytes)).toContain("ANULADO");
  });

  it("agrega QR y código de barras en el ticket de prueba", () => {
    const normal = buildTicket(toPrintTicket(sampleTicket()));
    const diagnostic = buildDiagnosticBytes();

    expect(diagnostic.length).toBeGreaterThan(normal.length);
  });

  it("codifica acentos con cp858 sin lanzar", () => {
    expect(() => buildTicket(toPrintTicket(sampleTicket()), { codepage: "cp858" })).not.toThrow();
  });
});
