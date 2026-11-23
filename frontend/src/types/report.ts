import type { Cents, Unit } from "@/types/catalog";
import type { PaymentMethod } from "@/types/sale";

export type PaymentTotals = Record<PaymentMethod, Cents>;

export interface ProductTotal {
  productId: string;
  sku: string;
  name: string;
  unit: Unit;
  pieces: number;
  grams: number;
  totalCents: Cents;
}

export interface CategoryTotal {
  name: string;
  totalCents: Cents;
}

export interface DailyReport {
  businessDate: string;
  ticketCount: number;
  totalCents: Cents;
  averageTicketCents: Cents;
  byPayment: PaymentTotals;
  byProduct: ProductTotal[];
  byCategory: CategoryTotal[];
}

export interface CashCut {
  businessDate: string;
  openingCashCents: Cents;
  countedCashCents: Cents;
  expectedCashCents: Cents;
  /** Puede ser negativo: faltante de caja. */
  differenceCents: number;
  ticketCount: number;
  totalCents: Cents;
  byPayment: PaymentTotals;
  closedAtUtc: string;
  recalculatedAtUtc: string | null;
}

export interface RemoteProductReport {
  product_id: string;
  sku: string;
  name: string;
  unit: Unit;
  pieces: number;
  grams: number;
  total: string;
}

export interface RemoteDailyReport {
  business_date: string;
  ticket_count: number;
  total: string;
  by_payment_method: Record<PaymentMethod, string>;
  products: RemoteProductReport[];
  categories: { name: string; total: string }[];
}

export interface ReconciliationPayment {
  localCents: Cents;
  remoteCents: Cents | null;
  differenceCents: number | null;
}

export interface Reconciliation {
  localTotalCents: Cents;
  remoteTotalCents: Cents | null;
  differenceCents: number | null;
  byPayment: Record<PaymentMethod, ReconciliationPayment>;
}
