import { centsToDecimal } from "@/lib/money";
import type { LocalTicket } from "@/types/sale";

const HEADERS = [
  "folio",
  "client_order_uuid",
  "fecha_negocio",
  "vendido_utc",
  "metodo_pago",
  "estado",
  "total_ticket",
  "linea_id",
  "producto_id",
  "sku",
  "producto",
  "categoria",
  "unidad",
  "cantidad",
  "gramos",
  "origen_precio",
  "precio_catalogo",
  "precio_unitario",
  "importe_linea",
  "motivo_anulacion",
  "anulado_utc",
] as const;

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

/** CSV con una fila por línea de ticket; las anuladas también se incluyen. */
export function buildSalesCsv(tickets: readonly LocalTicket[]): string {
  const rows: string[] = [HEADERS.map(cell).join(",")];

  for (const ticket of tickets) {
    for (const line of ticket.lines) {
      rows.push(
        [
          ticket.localFolio,
          ticket.clientOrderUuid,
          ticket.businessDate,
          ticket.soldAtUtc,
          ticket.paymentMethod,
          ticket.status,
          centsToDecimal(ticket.totalCents),
          line.lineId,
          line.productId,
          line.sku,
          line.name,
          line.categoryName,
          line.unit,
          line.quantity,
          line.grams,
          line.priceSource,
          centsToDecimal(line.catalogUnitPriceCents),
          centsToDecimal(line.unitPriceCents),
          centsToDecimal(line.lineTotalCents),
          ticket.voidReason ?? "",
          ticket.voidedAtUtc ?? "",
        ]
          .map(cell)
          .join(","),
      );
    }
  }

  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function salesCsvFileName(from: string, to: string): string {
  return from === to
    ? `polleria-ventas-${from}.csv`
    : `polleria-ventas-${from}_${to}.csv`;
}

export function downloadSalesCsv(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
