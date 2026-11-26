import { formatCents } from "@/lib/money";
import type { PrintTicket } from "@/types/print";
import {
  fitColumns,
  formatPrintLine,
  printDateTime,
  printPaymentLabel,
  PRINT_COLUMNS,
} from "@/printer/ticket";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ticketText(ticket: PrintTicket): string {
  const lines: string[] = [
    "POLLERÍA EL WERO",
    "Pollo y complementos",
    "",
    `Folio #${ticket.localFolio}`,
    printDateTime(ticket.soldAtUtc),
    `Pago: ${printPaymentLabel(ticket)}`,
    "-".repeat(PRINT_COLUMNS),
  ];

  if (ticket.status === "voided") {
    lines.push("*** ANULADO ***");
    if (ticket.voidReason) lines.push(fitColumns("Motivo", ticket.voidReason));
    lines.push("-".repeat(PRINT_COLUMNS));
  }

  if (ticket.lines.length === 0) {
    lines.push(fitColumns("Sin detalle", formatCents(ticket.totalCents)));
  } else {
    for (const line of ticket.lines) lines.push(formatPrintLine(line));
  }

  lines.push("-".repeat(PRINT_COLUMNS));
  lines.push(fitColumns("TOTAL", formatCents(ticket.totalCents)));
  lines.push("");
  lines.push("¡Gracias por su compra!");
  lines.push("");
  lines.push("");
  return lines.join("\n");
}

/** Vista imprimible de 58 mm para PDF/AirPrint; no habla con la térmica. */
export function renderTicketHtml(ticket: PrintTicket): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ticket ${escapeHtml(String(ticket.localFolio))}</title>
<style>
  @page { size: 58mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { width: 58mm; font-family: "Courier New", monospace; font-size: 9px; line-height: 1.25; }
  pre { margin: 0; padding: 2mm 1mm; white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body><pre>${escapeHtml(ticketText(ticket))}</pre></body>
</html>`;
}

/** Abre el diálogo del sistema con un iframe aislado de 58 mm. */
export function openSystemPrint(
  ticket: PrintTicket,
  doc: Document = document,
  win: Window = window,
): void {
  const iframe = doc.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.srcdoc = renderTicketHtml(ticket);
  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      iframe.remove();
      win.print();
      return;
    }
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => iframe.remove(), 1_000);
  };
  doc.body.appendChild(iframe);
}
