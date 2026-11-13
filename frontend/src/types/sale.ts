import type { Cents, Unit } from "@/types/catalog";
import type { DailyPriceSource } from "@/types/dailyPrice";

export type Grams = number & { readonly __brand: "Grams" };
export type PaymentMethod = "cash" | "card" | "transfer";
export type PriceSource = DailyPriceSource | "manual";

export interface CartLine {
  lineId: string;
  productId: string;
  sku: string;
  name: string;
  categoryName: string;
  unit: Unit;
  quantity: number;
  grams: Grams | null;
  priceSource: PriceSource;
  catalogUnitPriceCents: Cents;
  unitPriceCents: Cents;
  lineTotalCents: Cents;
}

export interface CartState {
  lines: CartLine[];
  paymentMethod: PaymentMethod;
}

export interface LocalTicket {
  schemaVersion: 1;
  clientOrderUuid: string;
  localFolio: number;
  soldAtUtc: string;
  businessDate: string;
  paymentMethod: PaymentMethod;
  lines: CartLine[];
  totalCents: Cents;
  status: "confirmed";
  catalogUpdatedAt: string;
}

export interface TicketWireLine {
  line_id: string;
  product_id: string;
  sku: string;
  name: string;
  category_name: string;
  unit: Unit;
  quantity: number;
  grams: number | null;
  price_source: PriceSource;
  catalog_unit_price: string;
  unit_price: string;
  line_total: string;
}

export interface TicketWire {
  schema_version: 1;
  client_order_uuid: string;
  sold_at_utc: string;
  business_date: string;
  payment_method: PaymentMethod;
  lines: TicketWireLine[];
  total: string;
  catalog_updated_at: string;
}

export interface OutboxRecord {
  clientOrderUuid: string;
  schemaVersion: 1;
  status: "pending";
  enqueuedAt: string;
  payload: TicketWire;
}
