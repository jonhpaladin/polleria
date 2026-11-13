import { describe, expect, it } from "vitest";

import { buildTicket, toTicketWire, validateTicket } from "@/lib/ticket";
import { makeCatalog } from "@/test/fixtures";
import type { Cents } from "@/types/catalog";
import type { CartLine } from "@/types/sale";

const catalog = makeCatalog();
const product = catalog.products.find((item) => item.id === "prd-pierna")!;

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    lineId: "line-1",
    productId: product.id,
    sku: product.sku,
    name: product.name,
    categoryName: "Pollo",
    unit: "kg",
    quantity: 1,
    grams: 500 as CartLine["grams"],
    priceSource: "lista",
    catalogUnitPriceCents: 15000 as Cents,
    unitPriceCents: 15000 as Cents,
    lineTotalCents: 7500 as Cents,
    ...overrides,
  };
}

function ticket(overrides: Partial<Parameters<typeof buildTicket>[0]> = {}) {
  return buildTicket(
    { lines: [line()], paymentMethod: "cash", catalogUpdatedAt: catalog.updatedAt, ...overrides },
    "11111111-1111-4111-8111-111111111111",
    7,
    new Date("2026-11-14T05:50:00Z"),
  );
}

describe("buildTicket", () => {
  it("congela líneas, total, folio local y día de negocio de México", () => {
    const result = ticket();

    expect(result).toMatchObject({
      schemaVersion: 1,
      localFolio: 7,
      businessDate: "2026-11-13",
      totalCents: 7500,
      paymentMethod: "cash",
      status: "confirmed",
    });
    expect(result.lines[0]!.lineTotalCents).toBe(7500);
  });

  it("rechaza un carrito vacío", () => {
    expect(() => ticket({ lines: [] })).toThrow("carrito vacío");
  });
});

describe("validateTicket", () => {
  it("acepta un ticket consistente", () => {
    expect(() => validateTicket(ticket())).not.toThrow();
  });

  it("rechaza un total que no coincide con sus líneas", () => {
    const result = ticket();
    result.totalCents = 1 as Cents;

    expect(() => validateTicket(result)).toThrow("total");
  });

  it("rechaza una línea cuyo importe no coincide con su precio y cantidad", () => {
    const result = ticket();
    result.lines[0]!.lineTotalCents = 1 as Cents;

    expect(() => validateTicket(result)).toThrow("importe");
  });

  it("rechaza un día de negocio que no coincide con la fecha de venta", () => {
    const result = ticket();
    result.businessDate = "2026-11-14";

    expect(() => validateTicket(result)).toThrow("día de negocio");
  });
});

describe("toTicketWire", () => {
  it("convierte dinero a strings de dos decimales y conserva el UUID", () => {
    const wire = toTicketWire(ticket());

    expect(wire).toMatchObject({
      schema_version: 1,
      client_order_uuid: "11111111-1111-4111-8111-111111111111",
      payment_method: "cash",
      total: "75.00",
      business_date: "2026-11-13",
    });
    expect(wire.lines[0]).toMatchObject({
      line_id: "line-1",
      grams: 500,
      unit: "kg",
      price_source: "lista",
      catalog_unit_price: "150.00",
      unit_price: "150.00",
      line_total: "75.00",
    });
  });
});
