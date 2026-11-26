import { APP_TIME_ZONE } from "@/lib/dailyPrices";
import { formatCents } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";
import { formatGrams } from "@/lib/weight";
import type { PrintLine, PrintTicket } from "@/types/print";
import type { CartLine, LocalTicket } from "@/types/sale";

const COLUMNS = 32;

export function quantityLabel(line: CartLine): string {
  if (line.unit === "kg") {
    return line.grams === null ? "0.000 kg" : formatGrams(line.grams);
  }
  return `${line.quantity} pza`;
}

/** El ticket de impresión es un snapshot; no consulta catálogo ni precios vivos. */
export function toPrintTicket(ticket: LocalTicket): PrintTicket {
  return {
    localFolio: ticket.localFolio,
    clientOrderUuid: ticket.clientOrderUuid,
    soldAtUtc: ticket.soldAtUtc,
    businessDate: ticket.businessDate,
    paymentMethod: ticket.paymentMethod,
    lines: ticket.lines.map((line) => toPrintLine(line)),
    totalCents: ticket.totalCents,
    status: ticket.status,
    voidReason: ticket.voidReason ?? null,
  };
}

function toPrintLine(line: CartLine): PrintLine {
  return {
    name: line.name,
    unit: line.unit,
    quantity: line.quantity,
    grams: line.grams,
    quantityLabel: quantityLabel(line),
    unitPriceCents: line.unitPriceCents,
    lineTotalCents: line.lineTotalCents,
  };
}

export function printDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

/** Ajusta una línea de dos columnas al ancho de 32 caracteres sin desbordar. */
export function fitColumns(left: string, right: string, columns = COLUMNS): string {
  const cleanLeft = left.replace(/\s+/g, " ").trim();
  const cleanRight = right.replace(/\s+/g, " ").trim();
  const available = Math.max(0, columns - cleanRight.length - 1);
  const fitted =
    cleanLeft.length > available
      ? `${cleanLeft.slice(0, Math.max(0, available - 3))}...`
      : cleanLeft;
  return `${fitted.padEnd(available)} ${cleanRight}`;
}

export function formatPrintLine(line: PrintLine, columns = COLUMNS): string {
  return fitColumns(
    `${line.quantityLabel} ${line.name}`,
    formatCents(line.lineTotalCents),
    columns,
  );
}

export function printPaymentLabel(ticket: PrintTicket): string {
  return PAYMENT_LABEL[ticket.paymentMethod];
}

export const PRINT_COLUMNS = COLUMNS;
