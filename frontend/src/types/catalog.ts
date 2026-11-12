export type Unit = "piece" | "kg";
export type PriceTier = "lista" | "promocion" | "mayoreo";

/** Centavos enteros. La marca evita pasar pesos con decimales a la UI. */
export type Cents = number & { readonly __brand: "Cents" };

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface ProductPrice {
  tier: PriceTier;
  priceCents: Cents;
  isDefault: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: Unit;
  prices: ProductPrice[];
  active: boolean;
}

export interface Catalog {
  /** ISO 8601 UTC; solo se usa para mostrar "actualizado hace…". */
  updatedAt: string;
  categories: Category[];
  products: Product[];
}

/** Contrato JSON de `GET /catalog` y de la semilla. */
export interface CategoryWire {
  id: string;
  name: string;
  sort_order: number;
}

export interface PriceWire {
  tier: string;
  price: string;
  is_default: boolean;
}

export interface ProductWire {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  unit: string;
  active: boolean;
  prices: PriceWire[];
}

export interface CatalogWire {
  updated_at: string;
  categories: CategoryWire[];
  products: ProductWire[];
}
