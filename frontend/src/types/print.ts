import type { Cents, Unit } from "@/types/catalog";
import type { PaymentMethod } from "@/types/sale";

export type PrinterConnectionType = "ble" | "usb";
export type PrinterStatus = "disconnected" | "connecting" | "connected" | "printing" | "error";
export type PrinterCodepage = "auto" | "cp858" | "cp850" | "cp437";
export type PrintJobStatus = "pending" | "printing" | "printed" | "failed" | "uncertain";
export type PrintReason = "sale" | "reprint" | "test";

export interface PrintLine {
  name: string;
  unit: Unit;
  quantity: number;
  grams: number | null;
  quantityLabel: string;
  unitPriceCents: Cents;
  lineTotalCents: Cents;
}

/** Snapshot mínimo para imprimir; no depende del catálogo vivo. */
export interface PrintTicket {
  localFolio: number;
  clientOrderUuid: string;
  soldAtUtc: string;
  businessDate: string;
  paymentMethod: PaymentMethod;
  lines: PrintLine[];
  totalCents: Cents;
  status: "confirmed" | "voided";
  voidReason?: string | null;
}

export interface PrintJob {
  id?: number;
  clientOrderUuid: string;
  createdAt: string;
  status: PrintJobStatus;
  attempts: number;
  lastError: string | null;
  ticket: PrintTicket;
  printedAtUtc: string | null;
  reason: PrintReason;
}

export interface PrinterDeviceInfo {
  type: PrinterConnectionType;
  name: string;
  language: string;
  codepageMapping: Record<string, number> | string;
  columns?: number;
  id?: string;
  serialNumber?: string | null;
  vendorId?: number;
  productId?: number;
}

export interface SavedPrinterDevice extends PrinterDeviceInfo {
  savedAtUtc: string;
}

export interface PrinterState {
  status: PrinterStatus;
  connectionType: PrinterConnectionType | null;
  deviceName: string | null;
  supportedBle: boolean;
  supportedUsb: boolean;
  pending: number;
  failed: number;
  uncertain: number;
  message: string | null;
  codepage: PrinterCodepage;
}

export function isPrinterCodepage(value: string): value is PrinterCodepage {
  return value === "auto" || value === "cp858" || value === "cp850" || value === "cp437";
}
