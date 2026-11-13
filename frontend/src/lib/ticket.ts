import { lineTotalCents } from "@/lib/cart";
import { businessDate } from "@/lib/dailyPrices";
import { centsToDecimal, sumCents } from "@/lib/money";
import { assertGrams } from "@/lib/weight";
import type { Cents } from "@/types/catalog";
import type { CartLine, LocalTicket, PaymentMethod, TicketWire } from "@/types/sale";

export interface TicketDraft {
  lines: readonly CartLine[];
  paymentMethod: PaymentMethod;
  catalogUpdatedAt: string;
}

export function buildTicket(
  draft: TicketDraft,
  clientOrderUuid: string,
  localFolio: number,
  now: Date,
): LocalTicket {
  if (draft.lines.length === 0) throw new Error("No se puede confirmar un carrito vacío");
  const totalCents = sumCents(draft.lines.map((line) => line.lineTotalCents));
  return {
    schemaVersion: 1,
    clientOrderUuid,
    localFolio,
    soldAtUtc: now.toISOString(),
    businessDate: businessDate(now),
    paymentMethod: draft.paymentMethod,
    lines: draft.lines.map((line) => ({ ...line })),
    totalCents,
    status: "confirmed",
    catalogUpdatedAt: draft.catalogUpdatedAt,
  };
}

export function validateTicket(ticket: LocalTicket): void {
  if (ticket.lines.length === 0) throw new Error("El ticket no tiene líneas");
  for (const line of ticket.lines) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("La cantidad de una línea no es válida");
    }
    if (line.unit === "kg") {
      if (line.grams === null) throw new Error("Una línea por kilo no tiene gramos");
      assertGrams(line.grams);
      if (line.quantity !== 1) throw new Error("Una línea por kilo solo lleva una cantidad");
    } else if (line.grams !== null) {
      throw new Error("Una línea por pieza no lleva gramos");
    }
    if (line.lineTotalCents !== lineTotalCents(line.unitPriceCents, line)) {
      throw new Error("El importe de la línea no coincide con su precio y cantidad");
    }
  }
  const total = sumCents(ticket.lines.map((line) => line.lineTotalCents));
  if (total !== ticket.totalCents) throw new Error("El total del ticket no coincide");
  if (!ticket.clientOrderUuid || ticket.schemaVersion !== 1) throw new Error("Ticket inválido");
  if (businessDate(new Date(ticket.soldAtUtc)) !== ticket.businessDate) {
    throw new Error("El día de negocio del ticket no coincide con su fecha");
  }
}

function grams(line: CartLine): number | null {
  return line.grams;
}

export function toTicketWire(ticket: LocalTicket): TicketWire {
  validateTicket(ticket);
  return {
    schema_version: 1,
    client_order_uuid: ticket.clientOrderUuid,
    sold_at_utc: ticket.soldAtUtc,
    business_date: ticket.businessDate,
    payment_method: ticket.paymentMethod,
    lines: ticket.lines.map((line) => ({
      line_id: line.lineId,
      product_id: line.productId,
      sku: line.sku,
      name: line.name,
      category_name: line.categoryName,
      unit: line.unit,
      quantity: line.quantity,
      grams: grams(line),
      price_source: line.priceSource,
      catalog_unit_price: centsToDecimal(line.catalogUnitPriceCents),
      unit_price: centsToDecimal(line.unitPriceCents),
      line_total: centsToDecimal(line.lineTotalCents),
    })),
    total: centsToDecimal(ticket.totalCents),
    catalog_updated_at: ticket.catalogUpdatedAt,
  };
}

export function assertLineTotal(line: CartLine, expected: Cents): void {
  if (line.lineTotalCents !== expected) {
    throw new Error("El importe de la línea cambió; vuelve a intentarlo");
  }
}
