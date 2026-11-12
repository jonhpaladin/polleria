import { describe, expect, it } from "vitest";

import {
  defaultPrice,
  formatUpdatedAt,
  promoPrice,
  selectProducts,
  validateCatalogPayload,
  visibleCategories,
  type CatalogErrorCode,
} from "@/lib/catalog";
import { makeCatalog, makeWireCatalog } from "@/test/fixtures";

function expectError(raw: unknown, code: CatalogErrorCode): void {
  const result = validateCatalogPayload(raw);
  expect(result.ok).toBe(false);
  if (result.ok) {
    return;
  }
  expect(result.error.code).toBe(code);
}

function wireWithProduct(patch: Record<string, unknown>): unknown {
  const wire = makeWireCatalog();
  return {
    ...wire,
    products: [{ ...wire.products[0], ...patch }],
  };
}

describe("validateCatalogPayload", () => {
  it("normaliza el payload válido a centavos y ordena los niveles", () => {
    const result = validateCatalogPayload(makeWireCatalog());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const product = result.catalog.products.find((item) => item.sku === "PIERNA-MUSLO");
    expect(product?.prices.map((price) => price.tier)).toEqual(["lista", "promocion"]);
    expect(product?.prices[0]?.priceCents).toBe(15000);
    expect(result.catalog.updatedAt).toBe("2026-11-11T18:04:00Z");
  });

  it("rechaza un payload que no es objeto", () => {
    expectError(null, "INVALID_SHAPE");
    expectError("hola", "INVALID_SHAPE");
  });

  it("rechaza un payload sin categorías o productos", () => {
    expectError({ updated_at: "2026-11-11T18:04:00Z", categories: [], products: "x" }, "INVALID_SHAPE");
    expectError({ categories: [] }, "INVALID_SHAPE");
  });

  it("rechaza dinero con formato inválido", () => {
    expectError(wireWithProduct({ prices: [{ tier: "lista", price: "150.5", is_default: true }] }), "INVALID_MONEY");
    expectError(wireWithProduct({ prices: [{ tier: "lista", price: 150.0, is_default: true }] }), "INVALID_MONEY");
  });

  it("rechaza precio cero o negativo", () => {
    expectError(wireWithProduct({ prices: [{ tier: "lista", price: "0.00", is_default: true }] }), "INVALID_PRICE");
  });

  it("rechaza unidad desconocida", () => {
    expectError(wireWithProduct({ unit: "litro" }), "UNKNOWN_UNIT");
  });

  it("rechaza nivel desconocido o repetido", () => {
    expectError(wireWithProduct({ prices: [{ tier: "b2b", price: "150.00", is_default: true }] }), "INVALID_TIER");
    expectError(
      wireWithProduct({
        prices: [
          { tier: "lista", price: "150.00", is_default: true },
          { tier: "lista", price: "140.00", is_default: false },
        ],
      }),
      "INVALID_TIER",
    );
  });

  it("rechaza producto sin precios", () => {
    expectError(wireWithProduct({ prices: [] }), "MISSING_PRICE");
  });

  it("rechaza cero o dos precios por defecto", () => {
    expectError(wireWithProduct({ prices: [{ tier: "lista", price: "150.00", is_default: false }] }), "INVALID_DEFAULT_PRICE");
    expectError(
      wireWithProduct({
        prices: [
          { tier: "lista", price: "150.00", is_default: true },
          { tier: "promocion", price: "140.00", is_default: true },
        ],
      }),
      "INVALID_DEFAULT_PRICE",
    );
  });

  it("rechaza id de producto duplicado", () => {
    const wire = makeWireCatalog();
    const duplicated = { ...wire.products[0], sku: "OTRO-SKU" };
    expectError({ ...wire, products: [wire.products[0], duplicated] }, "DUPLICATE_ID");
  });

  it("rechaza sku duplicado", () => {
    const wire = makeWireCatalog();
    const duplicated = { ...wire.products[0], id: "prd-otro" };
    expectError({ ...wire, products: [wire.products[0], duplicated] }, "DUPLICATE_SKU");
  });

  it("rechaza categoría inexistente", () => {
    expectError(wireWithProduct({ category_id: "cat-fantasma" }), "ORPHAN_CATEGORY");
  });

  it("rechaza id de categoría duplicado", () => {
    const wire = makeWireCatalog();
    expectError({ ...wire, categories: [wire.categories[0], wire.categories[0]] }, "DUPLICATE_ID");
  });

  it("no lanza con un JSON truncado simulado", () => {
    expect(() => validateCatalogPayload({ updated_at: "x" })).not.toThrow();
  });
});

describe("resolución de precios", () => {
  const catalog = makeCatalog();
  const product = catalog.products.find((item) => item.sku === "PIERNA-MUSLO")!;
  const combo = catalog.products.find((item) => item.sku === "COMBO-1")!;

  it("encuentra el precio por defecto", () => {
    expect(defaultPrice(product)?.priceCents).toBe(15000);
  });

  it("encuentra el precio de promoción", () => {
    expect(promoPrice(product)?.priceCents).toBe(13000);
  });

  it("devuelve undefined cuando no hay promoción", () => {
    expect(promoPrice(combo)).toBeUndefined();
  });
});

describe("visibleCategories", () => {
  it("oculta categorías sin productos activos y ordena por sortOrder", () => {
    const catalog = makeCatalog();

    const categories = visibleCategories(catalog.categories, catalog.products);

    expect(categories.map((category) => category.id)).toEqual(["cat-pollo", "cat-promos"]);
  });

  it("oculta la categoría si sus únicos productos están inactivos", () => {
    const catalog = makeCatalog();
    const products = catalog.products.map((product) =>
      product.categoryId === "cat-promos" ? { ...product, active: false } : product,
    );

    const categories = visibleCategories(catalog.categories, products);

    expect(categories.map((category) => category.id)).toEqual(["cat-pollo"]);
  });
});

describe("selectProducts", () => {
  const catalog = makeCatalog();

  it("devuelve todos los activos ordenados por nombre", () => {
    const products = selectProducts(catalog.products, "all");

    expect(products.map((product) => product.name)).toEqual(["Combo familiar", "Pierna y muslo"]);
  });

  it("filtra por categoría", () => {
    const products = selectProducts(catalog.products, "cat-pollo");

    expect(products.map((product) => product.id)).toEqual(["prd-pierna"]);
  });

  it("no devuelve inactivos", () => {
    const products = catalog.products.map((product) => ({ ...product, active: false }));

    expect(selectProducts(products, "all")).toEqual([]);
  });
});

describe("formatUpdatedAt", () => {
  const now = new Date("2026-11-11T18:10:00Z");

  it("describe segundos", () => {
    expect(formatUpdatedAt("2026-11-11T18:09:30Z", now)).toBe("actualizado hace unos segundos");
  });

  it("describe minutos", () => {
    expect(formatUpdatedAt("2026-11-11T18:07:00Z", now)).toBe("actualizado hace 3 min");
  });

  it("usa singular en un minuto", () => {
    expect(formatUpdatedAt("2026-11-11T18:09:00Z", now)).toBe("actualizado hace 1 min");
  });

  it("describe horas", () => {
    expect(formatUpdatedAt("2026-11-11T16:10:00Z", now)).toBe("actualizado hace 2 h");
  });

  it("describe días", () => {
    expect(formatUpdatedAt("2026-11-08T18:10:00Z", now)).toBe("actualizado hace 3 días");
  });

  it("no describe el futuro", () => {
    expect(formatUpdatedAt("2026-11-11T19:00:00Z", now)).toBe("actualizado hace unos segundos");
  });

  it("tolera una fecha inválida", () => {
    expect(formatUpdatedAt("no-es-fecha", now)).toBe("actualizado recientemente");
  });
});
