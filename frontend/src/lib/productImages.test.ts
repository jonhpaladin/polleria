import { describe, expect, it } from "vitest";

import seedWire from "@/data/seedCatalog.json";
import { validateCatalogPayload } from "@/lib/catalog";
import {
  fallbackInitial,
  INTENTIONAL_FALLBACKS,
  PRODUCT_IMAGE_BY_SKU,
  productImageUrl,
} from "@/lib/productImages";

function activeProducts() {
  const result = validateCatalogPayload(seedWire);
  if (!result.ok) throw new Error(result.error.detail);
  return result.catalog.products.filter((product) => product.active);
}

describe("productImages", () => {
  it("cubre los 25 productos activos con imagen y sin respaldos intencionales", () => {
    const active = activeProducts();
    const mapped = active.filter((product) => PRODUCT_IMAGE_BY_SKU[product.sku] !== undefined);

    expect(active).toHaveLength(25);
    expect(mapped).toHaveLength(25);
    expect(INTENTIONAL_FALLBACKS).toEqual([]);
  });

  it("resuelve una URL para cada SKU con imagen y null para el resto", () => {
    for (const [sku] of Object.entries(PRODUCT_IMAGE_BY_SKU)) {
      expect(productImageUrl(sku), sku).not.toBeNull();
    }
    expect(productImageUrl("REFRESCO")).toBeNull();
    expect(productImageUrl("NO-EXISTE")).toBeNull();
  });

  it("genera la inicial del respaldo", () => {
    expect(fallbackInitial("Agua 600 ml")).toBe("A");
    expect(fallbackInitial("  pollo entero")).toBe("P");
    expect(fallbackInitial("")).toBe("?");
  });
});
