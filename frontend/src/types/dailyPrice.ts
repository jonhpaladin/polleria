import type { Cents, Unit } from "@/types/catalog";

export interface DailyPrice {
  id: string;
  businessDate: string;
  productId: string;
  unit: Unit;
  normalPriceCents: Cents;
  promotionPriceCents: Cents | null;
  wholesalePriceCents: Cents | null;
  updatedAtUtc: string;
}

export type DailyPriceSource = "lista" | "promocion" | "mayoreo";

export interface DailyPriceDraft {
  productId: string;
  normal: string;
  promotion: string;
  wholesale: string;
}
