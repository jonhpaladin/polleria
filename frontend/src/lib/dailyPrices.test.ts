import { describe, expect, it } from "vitest";

import {
  buildBaseDailyPrices,
  businessDate,
  copyDailyPrices,
  dailyPriceToDraft,
  parseOptionalPrice,
  selectDailyPrice,
  validateManualPrice,
} from "@/lib/dailyPrices";
import { makeCatalog } from "@/test/fixtures";
import type { DailyPrice } from "@/types/dailyPrice";

const UPDATED_AT = "2026-11-13T15:00:00.000Z";

function priceRow(overrides: Partial<DailyPrice> = {}): DailyPrice {
  return {
    id: "2026-11-12:prd-pierna",
    businessDate: "2026-11-12",
    productId: "prd-pierna",
    unit: "kg",
    normalPriceCents: 14000 as DailyPrice["normalPriceCents"],
    promotionPriceCents: null,
    wholesalePriceCents: 12000 as DailyPrice["wholesalePriceCents"],
    updatedAtUtc: UPDATED_AT,
    ...overrides,
  };
}

describe("businessDate", () => {
  it("una venta de las 23:50 en México pertenece a ese día", () => {
    expect(businessDate(new Date("2026-11-14T05:50:00Z"))).toBe("2026-11-13");
  });

  it("cruza el día a la medianoche de México, no a la de UTC", () => {
    expect(businessDate(new Date("2026-11-14T06:10:00Z"))).toBe("2026-11-14");
    expect(businessDate(new Date("2026-11-14T05:59:00Z"))).toBe("2026-11-13");
  });
});

describe("buildBaseDailyPrices", () => {
  it("toma lista, promoción y mayoreo del catálogo y deja null lo ausente", () => {
    const rows = buildBaseDailyPrices(makeCatalog(), "2026-11-13", UPDATED_AT);
    const pierna = rows.find((row) => row.productId === "prd-pierna");

    expect(pierna).toMatchObject({
      id: "2026-11-13:prd-pierna",
      unit: "kg",
      normalPriceCents: 15000,
      promotionPriceCents: 13000,
      wholesalePriceCents: null,
    });
  });

  it("omite productos inactivos", () => {
    const catalog = makeCatalog();
    catalog.products = catalog.products.map((product) =>
      product.id === "prd-pierna" ? { ...product, active: false } : product,
    );

    const rows = buildBaseDailyPrices(catalog, "2026-11-13", UPDATED_AT);

    expect(rows.map((row) => row.productId)).toEqual(["prd-combo"]);
  });
});

describe("copyDailyPrices", () => {
  it("copia la hoja anterior incluidos los vacíos y no rellena la promo del catálogo", () => {
    const rows = copyDailyPrices(makeCatalog(), "2026-11-13", [priceRow()], UPDATED_AT);
    const pierna = rows.find((row) => row.productId === "prd-pierna");

    expect(pierna).toMatchObject({
      id: "2026-11-13:prd-pierna",
      normalPriceCents: 14000,
      promotionPriceCents: null,
      wholesalePriceCents: 12000,
      updatedAtUtc: UPDATED_AT,
    });
  });

  it("usa el catálogo si el producto cambió de unidad", () => {
    const rows = copyDailyPrices(
      makeCatalog(),
      "2026-11-13",
      [priceRow({ unit: "piece" })],
      UPDATED_AT,
    );

    expect(rows.find((row) => row.productId === "prd-pierna")?.unit).toBe("kg");
    expect(rows.find((row) => row.productId === "prd-pierna")?.normalPriceCents).toBe(15000);
  });

  it("agrega productos nuevos desde el catálogo", () => {
    const rows = copyDailyPrices(makeCatalog(), "2026-11-13", [], UPDATED_AT);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.productId === "prd-combo")?.normalPriceCents).toBe(29900);
  });
});

describe("selectDailyPrice", () => {
  it("devuelve el nivel pedido y null cuando no existe", () => {
    const row = priceRow();

    expect(selectDailyPrice(row, "lista")).toBe(14000);
    expect(selectDailyPrice(row, "mayoreo")).toBe(12000);
    expect(selectDailyPrice(row, "promocion")).toBeNull();
  });
});

describe("parseOptionalPrice", () => {
  it("acepta vacío como null y convierte pesos a centavos", () => {
    expect(parseOptionalPrice("  ")).toBeNull();
    expect(parseOptionalPrice("150.25")).toBe(15025);
  });

  it("acepta pesos sin decimales o con un decimal", () => {
    expect(parseOptionalPrice("150")).toBe(15000);
    expect(parseOptionalPrice("150.5")).toBe(15050);
    expect(parseOptionalPrice("150.")).toBe(15000);
  });

  it("rechaza cero, más de dos decimales y formatos inválidos", () => {
    expect(() => parseOptionalPrice("0.00")).toThrow("mayor que cero");
    expect(() => parseOptionalPrice("150.555")).toThrow();
    expect(() => parseOptionalPrice("abc")).toThrow();
  });
});

describe("validateManualPrice", () => {
  it("exige un precio manual positivo y devuelve centavos enteros", () => {
    expect(validateManualPrice("175.5")).toBe(17550);
    expect(() => validateManualPrice("")).toThrow("obligatorio");
    expect(() => validateManualPrice("0")).toThrow("mayor que cero");
    expect(() => validateManualPrice("1.234")).toThrow();
    expect(() => validateManualPrice("-5.00")).toThrow();
  });
});

describe("dailyPriceToDraft", () => {
  it("muestra el precio con dos decimales y vacío cuando es null", () => {
    expect(dailyPriceToDraft(priceRow())).toEqual({
      productId: "prd-pierna",
      normal: "140.00",
      promotion: "",
      wholesale: "120.00",
    });
  });
});
