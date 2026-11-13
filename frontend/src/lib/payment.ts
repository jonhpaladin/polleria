import type { PaymentMethod } from "@/types/sale";

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "transfer"];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}
