import type { PolleriaDb } from "@/lib/db";
import { getDb } from "@/lib/db";
import type { PrinterAdapter } from "@/printer/adapters/types";
import { BlePrinterAdapter } from "@/printer/adapters/ble";
import { UsbPrinterAdapter } from "@/printer/adapters/usb";
import { openSystemPrint } from "@/printer/browserPrint";
import { buildDiagnosticTicket, buildTicket } from "@/printer/encoder";
import {
  claimNextPrintJob,
  discardPrintJob,
  enqueuePrintJob,
  listAttentionPrintJobs,
  markPrinted,
  markUncertain,
  printQueueCounts,
  recoverInterruptedPrintJobs,
  retryPrintJob,
} from "@/printer/queue";
import { toPrintTicket } from "@/printer/ticket";
import type { LocalTicket } from "@/types/sale";
import type {
  PrinterCodepage,
  PrinterConnectionType,
  PrinterDeviceInfo,
  PrinterState,
  PrintJob,
  PrintTicket,
  SavedPrinterDevice,
} from "@/types/print";
import { isPrinterCodepage } from "@/types/print";

const DEVICE_KEY = "polleria:printer-device";
const CODEPAGE_KEY = "polleria:printer-codepage";

interface StoredDevice {
  savedAtUtc: string;
  type: PrinterConnectionType;
  id?: string;
  serialNumber?: string | null;
  vendorId?: number;
  productId?: number;
}

export interface PrinterServiceOptions {
  db?: PolleriaDb;
  ble?: PrinterAdapter;
  usb?: PrinterAdapter;
  now?: () => Date;
  browserPrint?: (ticket: PrintTicket) => void;
  supported?: { ble: boolean; usb: boolean };
}

function hasBluetooth(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

function hasUsb(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function readStoredDevice(): StoredDevice | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDevice>;
    if (parsed.type !== "ble" && parsed.type !== "usb") return null;
    return { ...parsed, type: parsed.type, savedAtUtc: parsed.savedAtUtc ?? "" };
  } catch {
    return null;
  }
}

function readCodepage(): PrinterCodepage {
  try {
    const raw = localStorage.getItem(CODEPAGE_KEY) ?? "auto";
    return isPrinterCodepage(raw) ? raw : "auto";
  } catch {
    return "auto";
  }
}

/**
 * Orquesta adaptadores y cola. La venta nunca espera a la impresora: `printTicket`
 * encola primero y, si hay conexión, drena en segundo plano.
 */
export class PrinterService {
  private readonly db: PolleriaDb;
  private readonly ble: PrinterAdapter;
  private readonly usb: PrinterAdapter;
  private readonly now: () => Date;
  private readonly browserPrint: (ticket: PrintTicket) => void;
  private readonly listeners = new Set<(state: PrinterState) => void>();
  private state: PrinterState;
  private active: PrinterAdapter | null = null;
  private device: PrinterDeviceInfo | null = null;
  private currentJob: PrintJob | null = null;
  private initialized = false;
  private draining = false;
  private disconnectedDuringPrint = false;

  constructor(options: PrinterServiceOptions = {}) {
    this.db = options.db ?? getDb();
    this.ble = options.ble ?? new BlePrinterAdapter();
    this.usb = options.usb ?? new UsbPrinterAdapter();
    this.now = options.now ?? (() => new Date());
    this.browserPrint = options.browserPrint ?? ((ticket) => openSystemPrint(ticket));
    const supported = options.supported ?? { ble: hasBluetooth(), usb: hasUsb() };
    this.state = {
      status: "disconnected",
      connectionType: null,
      deviceName: null,
      supportedBle: supported.ble,
      supportedUsb: supported.usb,
      pending: 0,
      failed: 0,
      uncertain: 0,
      message: null,
      codepage: readCodepage(),
    };
    this.ble.onDisconnect(() => void this.handleDisconnect(this.ble));
    this.usb.onDisconnect(() => void this.handleDisconnect(this.usb));
  }

  getState(): PrinterState {
    return { ...this.state };
  }

  subscribe(listener: (state: PrinterState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  private patch(patch: Partial<PrinterState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await recoverInterruptedPrintJobs(this.db);
      await this.refreshCounts();
    } catch (cause) {
      console.warn("PRINT_QUEUE_RECOVERY_FAILED", cause);
    }
    const saved = readStoredDevice();
    if (!saved) {
      this.emit();
      return;
    }
    await this.reconnect();
  }

  async connect(type: PrinterConnectionType): Promise<void> {
    if (type === "ble" && !this.state.supportedBle) {
      this.patch({ status: "error", message: "Este navegador no soporta Web Bluetooth." });
      return;
    }
    if (type === "usb" && !this.state.supportedUsb) {
      this.patch({ status: "error", message: "Este navegador no soporta WebUSB." });
      return;
    }
    if (this.active) await this.disconnect();

    this.patch({ status: "connecting", message: "Buscando impresora…", connectionType: type });
    try {
      const adapter = this.adapterFor(type);
      const device = await adapter.connect();
      if (!device) {
        this.patch({
          status: "disconnected",
          message: "No se seleccionó ninguna impresora.",
          connectionType: null,
        });
        return;
      }
      await this.activate(adapter, device);
    } catch (cause) {
      console.warn("PRINTER_CONNECT_FAILED", cause);
      this.patch({
        status: "error",
        message: errorText(cause, "No se pudo conectar la impresora."),
        connectionType: null,
      });
    }
  }

  async reconnect(): Promise<boolean> {
    const saved = readStoredDevice();
    if (!saved) return false;
    if (saved.type === "ble" && !this.state.supportedBle) return false;
    if (saved.type === "usb" && !this.state.supportedUsb) return false;

    this.patch({ status: "connecting", message: "Reconectando impresora…" });
    try {
      const adapter = this.adapterFor(saved.type);
      const device = await adapter.reconnect(toSavedDeviceFromStored(saved));
      if (!device) {
        this.patch({
          status: "disconnected",
          message: "No se encontró la impresora guardada; vuelve a conectarla.",
        });
        return false;
      }
      await this.activate(adapter, device);
      return true;
    } catch (cause) {
      console.warn("PRINTER_RECONNECT_FAILED", cause);
      this.patch({
        status: "disconnected",
        message: "No se pudo reconectar; vuelve a conectar la impresora.",
      });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    const active = this.active;
    this.active = null;
    this.device = null;
    try {
      await active?.disconnect();
    } catch (cause) {
      console.warn("PRINTER_DISCONNECT_FAILED", cause);
    }
    this.patch({
      status: "disconnected",
      connectionType: null,
      deviceName: null,
      message: "Impresora desconectada.",
    });
  }

  private adapterFor(type: PrinterConnectionType): PrinterAdapter {
    return type === "ble" ? this.ble : this.usb;
  }

  private async activate(adapter: PrinterAdapter, device: PrinterDeviceInfo): Promise<void> {
    this.active = adapter;
    this.device = device;
    this.disconnectedDuringPrint = false;
    this.saveDevice(device);
    this.patch({
      status: "connected",
      connectionType: adapter.type,
      deviceName: device.name,
      message: "Impresora conectada.",
    });
    await this.refreshCounts();
    await this.drain();
  }

  private saveDevice(device: PrinterDeviceInfo): void {
    try {
      const saved: StoredDevice = {
        savedAtUtc: this.now().toISOString(),
        type: device.type,
        id: device.id,
        serialNumber: device.serialNumber,
        vendorId: device.vendorId,
        productId: device.productId,
      };
      localStorage.setItem(DEVICE_KEY, JSON.stringify(saved));
    } catch {
      // Sin localStorage la impresora funciona en esta sesión; solo no reconecta.
    }
  }

  async printTicket(ticket: LocalTicket, reason: "sale" | "reprint" = "sale"): Promise<void> {
    const model = toPrintTicket(ticket);
    await this.enqueueAndMaybePrint(model, reason);
  }

  async printTest(): Promise<void> {
    if (!this.active?.isConnected()) {
      this.browserPrint(buildDiagnosticTicket());
      this.patch({ message: "Vista de impresión del sistema abierta." });
      return;
    }
    this.patch({ status: "printing", message: "Imprimiendo prueba…" });
    try {
      await this.active.print(
        buildTicket(buildDiagnosticTicket(), this.encoderOptions(true)),
      );
      this.patch({ status: "connected", message: "Prueba enviada." });
    } catch (cause) {
      console.warn("PRINT_TEST_FAILED", cause);
      this.patch({
        status: "error",
        message: errorText(cause, "No se pudo imprimir la prueba."),
      });
    }
  }

  async printWithSystem(ticket: PrintTicket): Promise<void> {
    this.browserPrint(ticket);
    this.patch({ message: "Vista de impresión del sistema abierta." });
  }

  async printTicketWithSystem(ticket: LocalTicket): Promise<void> {
    this.browserPrint(toPrintTicket(ticket));
    this.patch({ message: "Vista de impresión del sistema abierta." });
  }

  private async enqueueAndMaybePrint(
    ticket: PrintTicket,
    reason: "sale" | "reprint",
  ): Promise<void> {
    try {
      const job = await enqueuePrintJob(ticket, reason, { db: this.db, now: this.now() });
      await this.refreshCounts();
      if (job.status === "printed") {
        this.patch({ message: "Este ticket ya se imprimió." });
        return;
      }
      if (job.status === "uncertain" || job.status === "failed") {
        this.patch({
          message:
            job.status === "uncertain"
              ? "Ese ticket quedó incierto; confirma en Impresora si salió antes de reimprimir."
              : "Ese ticket falló; reinténtalo desde Impresora.",
        });
        return;
      }
      if (!this.active?.isConnected()) {
        this.patch({ message: "Ticket guardado; se imprimirá al conectar la impresora." });
        return;
      }
      await this.drain();
    } catch (cause) {
      console.warn("PRINT_ENQUEUE_FAILED", cause);
      this.patch({
        status: "error",
        message: errorText(cause, "No se pudo guardar el ticket para imprimir."),
      });
    }
  }

  /** Reintenta pendientes y fallidos; un `uncertain` requiere confirmación explícita. */
  async drain(): Promise<void> {
    if (this.draining || !this.active?.isConnected()) {
      await this.refreshCounts();
      return;
    }
    this.draining = true;
    this.disconnectedDuringPrint = false;
    let hadError = false;
    try {
      while (this.active?.isConnected()) {
        const adapter = this.active;
        if (!adapter) break;
        const job = await claimNextPrintJob(this.db);
        if (!job) break;
        this.currentJob = job;
        this.patch({ status: "printing", message: `Imprimiendo folio ${job.ticket.localFolio}…` });
        try {
          await adapter.print(buildTicket(job.ticket, this.encoderOptions()));
          if (this.disconnectedDuringPrint || !adapter.isConnected()) {
            hadError = true;
            await markUncertain(this.db, job, "La impresora se desconectó durante la impresión.");
            this.currentJob = null;
            await this.refreshCounts();
            this.patch({
              status: "disconnected",
              message: "La impresora se desconectó; revisa el ticket antes de reimprimir.",
            });
            break;
          }
          await markPrinted(this.db, job, this.now());
          this.currentJob = null;
          await this.refreshCounts();
        } catch (cause) {
          hadError = true;
          console.warn("PRINT_JOB_FAILED", cause);
          await markUncertain(
            this.db,
            job,
            errorText(cause, "Falló la impresión; no sabemos si salió completa."),
          );
          this.currentJob = null;
          await this.refreshCounts();
          this.patch({
            status: "error",
            message: "No sabemos si el ticket salió; revisa la impresora antes de reimprimir.",
          });
          break;
        }
      }
    } finally {
      this.currentJob = null;
      this.draining = false;
      await this.refreshCounts();
      const connected = this.active?.isConnected() ?? false;
      this.patch({
        status: hadError ? (connected ? "error" : "disconnected") : connected ? "connected" : "disconnected",
        message: hadError
          ? this.state.message
          : connected
            ? "Impresora lista."
            : this.state.message,
      });
    }
  }

  async retryFailed(id: number): Promise<void> {
    await retryPrintJob(this.db, id);
    await this.refreshCounts();
    await this.drain();
  }

  /** Solo se llama después de que el cajero confirma que el ticket no salió. */
  async retryUncertain(id: number): Promise<void> {
    await retryPrintJob(this.db, id);
    await this.refreshCounts();
    await this.drain();
  }

  async discard(id: number): Promise<void> {
    await discardPrintJob(this.db, id);
    await this.refreshCounts();
  }

  async listAttentionJobs(): Promise<PrintJob[]> {
    return listAttentionPrintJobs(this.db);
  }

  setCodepage(codepage: PrinterCodepage): void {
    this.patch({ codepage });
    try {
      localStorage.setItem(CODEPAGE_KEY, codepage);
    } catch {
      // La selección queda solo para esta sesión.
    }
  }

  private encoderOptions(diagnostic = false) {
    return {
      language: this.device?.language,
      codepageMapping: this.device?.codepageMapping,
      codepage: this.state.codepage,
      diagnostic,
    };
  }

  private async handleDisconnect(adapter: PrinterAdapter): Promise<void> {
    if (this.active !== adapter) return;
    this.disconnectedDuringPrint = true;
    this.active = null;
    this.device = null;
    const wasPrinting = this.currentJob !== null;
    if (wasPrinting) {
      const job = this.currentJob;
      this.currentJob = null;
      if (job) {
        await markUncertain(this.db, job, "La impresora se desconectó durante la impresión.");
      }
    }
    await this.refreshCounts();
    this.patch({
      status: "disconnected",
      connectionType: null,
      deviceName: null,
      message: wasPrinting
        ? "La impresora se desconectó; revisa el ticket antes de reimprimir."
        : "La impresora se desconectó.",
    });
  }

  private async refreshCounts(): Promise<void> {
    try {
      const counts = await printQueueCounts(this.db);
      this.patch(counts);
    } catch (cause) {
      console.warn("PRINT_QUEUE_COUNT_FAILED", cause);
    }
  }
}

function toSavedDeviceFromStored(saved: StoredDevice): SavedPrinterDevice {
  return {
    type: saved.type,
    name: "Impresora guardada",
    language: "esc-pos",
    codepageMapping: "epson",
    savedAtUtc: saved.savedAtUtc,
    id: saved.id,
    serialNumber: saved.serialNumber,
    vendorId: saved.vendorId,
    productId: saved.productId,
  };
}

let defaultService: PrinterService | null = null;

export function getPrinterService(): PrinterService {
  defaultService ??= new PrinterService();
  return defaultService;
}

export type { PrinterService as PrinterServiceType };
