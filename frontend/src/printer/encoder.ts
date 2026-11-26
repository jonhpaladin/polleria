import ReceiptPrinterEncoder, {
  type ReceiptPrinterEncoderOptions,
} from "@point-of-sale/receipt-printer-encoder";

import { businessDate } from "@/lib/dailyPrices";
import { formatCents } from "@/lib/money";
import type { PrinterCodepage, PrintTicket } from "@/types/print";
import {
  fitColumns,
  formatPrintLine,
  printDateTime,
  printPaymentLabel,
  PRINT_COLUMNS,
} from "@/printer/ticket";

export interface EncodeTicketOptions {
  language?: string;
  codepageMapping?: Record<string, number> | string;
  codepage?: PrinterCodepage;
  diagnostic?: boolean;
}

function encoderLanguage(language?: string): "esc-pos" | "star-line" | "star-prnt" {
  if (language === "star-line" || language === "star-prnt") return language;
  return "esc-pos";
}

function encoderOptions(options: EncodeTicketOptions): ReceiptPrinterEncoderOptions {
  return {
    columns: PRINT_COLUMNS,
    language: encoderLanguage(options.language),
    codepageMapping: (options.codepageMapping ??
      "epson") as ReceiptPrinterEncoderOptions["codepageMapping"],
    codepageCandidates:
      options.codepage && options.codepage !== "auto"
        ? ([options.codepage] as ReceiptPrinterEncoderOptions["codepageCandidates"])
        : undefined,
  };
}

/** Genera los bytes ESC/POS de un ticket de 58 mm; sin corte automático. */
export function buildTicket(ticket: PrintTicket, options: EncodeTicketOptions = {}): Uint8Array {
  const encoder = new ReceiptPrinterEncoder(encoderOptions(options));

  encoder.initialize();
  encoder.align("center").bold(true).size(1, 1).line("POLLERÍA EL WERO");
  encoder.bold(false).line("Pollo y complementos").newline();
  encoder.align("left").line(`Folio #${ticket.localFolio}`).line(printDateTime(ticket.soldAtUtc));
  encoder.line(`Pago: ${printPaymentLabel(ticket)}`);
  encoder.line("-".repeat(PRINT_COLUMNS));

  if (ticket.status === "voided") {
    encoder.align("center").bold(true).line("*** ANULADO ***").bold(false).align("left");
    if (ticket.voidReason) encoder.line(fitColumns("Motivo", ticket.voidReason));
    encoder.line("-".repeat(PRINT_COLUMNS));
  }

  if (ticket.lines.length === 0) {
    encoder.line(fitColumns("Sin detalle", formatCents(ticket.totalCents)));
  } else {
    for (const line of ticket.lines) {
      encoder.line(formatPrintLine(line));
    }
  }

  encoder.line("-".repeat(PRINT_COLUMNS));
  encoder.align("right").bold(true).size(1, 2);
  encoder.line(`TOTAL ${formatCents(ticket.totalCents)}`);
  encoder.size(1, 1).bold(false);

  if (options.diagnostic) {
    encoder.align("center").line("Prueba de impresión").qrcode("https://polleria-q84.pages.dev");
    encoder.barcode("WERO-009", "code128").newline();
  }

  encoder.align("center").line("¡Gracias por su compra!").newline(3);
  return encoder.encode();
}

export function buildDiagnosticTicket(now = new Date()): PrintTicket {
  const totalCents = 25_000 as PrintTicket["totalCents"];
  return {
    localFolio: 999,
    clientOrderUuid: "printer-test",
    soldAtUtc: now.toISOString(),
    businessDate: businessDate(now),
    paymentMethod: "cash",
    lines: [
      {
        name: "Pierna y muslo",
        unit: "kg",
        quantity: 1,
        grams: 500,
        quantityLabel: "0.500 kg",
        unitPriceCents: 15_000 as PrintTicket["totalCents"],
        lineTotalCents: 15_000 as PrintTicket["totalCents"],
      },
      {
        name: "Empanada de champiñón",
        unit: "piece",
        quantity: 1,
        grams: null,
        quantityLabel: "1 pza",
        unitPriceCents: 10_000 as PrintTicket["totalCents"],
        lineTotalCents: 10_000 as PrintTicket["totalCents"],
      },
    ],
    totalCents,
    status: "confirmed",
    voidReason: null,
  };
}

export function buildDiagnosticBytes(options: EncodeTicketOptions = {}): Uint8Array {
  return buildTicket(buildDiagnosticTicket(), { ...options, diagnostic: true });
}
