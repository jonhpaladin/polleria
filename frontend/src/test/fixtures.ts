import { validateCatalogPayload } from "@/lib/catalog";
import type { Catalog, CatalogWire } from "@/types/catalog";

/** Catálogo wire de ejemplo con dos categorías y dos productos. */
export function makeWireCatalog(overrides: Partial<CatalogWire> = {}): CatalogWire {
  return {
    updated_at: "2026-11-11T18:04:00Z",
    categories: [
      { id: "cat-pollo", name: "Pollo", sort_order: 1 },
      { id: "cat-promos", name: "Promociones", sort_order: 2 },
      { id: "cat-vacia", name: "Sin productos", sort_order: 3 },
    ],
    products: [
      {
        id: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        category_id: "cat-pollo",
        unit: "kg",
        active: true,
        prices: [
          { tier: "lista", price: "150.00", is_default: true },
          { tier: "promocion", price: "130.00", is_default: false },
        ],
      },
      {
        id: "prd-combo",
        sku: "COMBO-1",
        name: "Combo familiar",
        category_id: "cat-promos",
        unit: "piece",
        active: true,
        prices: [{ tier: "lista", price: "299.00", is_default: true }],
      },
    ],
    ...overrides,
  };
}

/** Catálogo normalizado a centavos, listo para la UI. */
export function makeCatalog(overrides: Partial<CatalogWire> = {}): Catalog {
  const result = validateCatalogPayload(makeWireCatalog(overrides));
  if (!result.ok) {
    throw new Error(`Catálogo de prueba inválido: ${result.error.code}`);
  }
  return result.catalog;
}
