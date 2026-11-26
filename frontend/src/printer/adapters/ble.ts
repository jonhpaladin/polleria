import WebBluetoothReceiptPrinter, {
  type BluetoothReceiptPrinterDevice,
} from "@point-of-sale/webbluetooth-receipt-printer";

import type { PrinterAdapter } from "@/printer/adapters/types";
import type { PrinterDeviceInfo, SavedPrinterDevice } from "@/types/print";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Envuelve la librería BLE; el selector debe abrirse desde un gesto del usuario. */
export class BlePrinterAdapter implements PrinterAdapter {
  readonly type = "ble" as const;
  private printer: WebBluetoothReceiptPrinter | null = null;
  private device: PrinterDeviceInfo | null = null;
  private connectedResolver: ((value: PrinterDeviceInfo | null) => void) | null = null;
  private connectedTimer: number | null = null;
  private readonly disconnectListeners = new Set<() => void>();

  private ensurePrinter(): WebBluetoothReceiptPrinter {
    if (this.printer) return this.printer;
    if (typeof navigator === "undefined" || !navigator.bluetooth) {
      throw new Error("Este navegador no soporta Web Bluetooth.");
    }
    this.printer = new WebBluetoothReceiptPrinter();
    this.printer.addEventListener("connected", (event) => {
      this.device = toDevice(event);
      this.resolveConnected(this.device);
    });
    this.printer.addEventListener("disconnected", () => {
      this.device = null;
      this.resolveConnected(null);
      for (const listener of this.disconnectListeners) listener();
    });
    return this.printer;
  }

  private resolveConnected(value: PrinterDeviceInfo | null): void {
    if (this.connectedTimer !== null) {
      window.clearTimeout(this.connectedTimer);
      this.connectedTimer = null;
    }
    const resolve = this.connectedResolver;
    this.connectedResolver = null;
    resolve?.(value);
  }

  private waitForConnection(timeoutMs: number): Promise<PrinterDeviceInfo | null> {
    this.resolveConnected(null);
    return new Promise((resolve) => {
      this.connectedResolver = resolve;
      this.connectedTimer = window.setTimeout(() => this.resolveConnected(null), timeoutMs);
    });
  }

  async connect(): Promise<PrinterDeviceInfo | null> {
    const printer = this.ensurePrinter();
    const connected = this.waitForConnection(45_000);
    await printer.connect();
    // Si el usuario canceló, no habrá evento; no dejamos la UI 45 s esperando.
    const result = await Promise.race([connected, delay(1_500).then(() => this.device)]);
    return result;
  }

  async reconnect(saved: SavedPrinterDevice): Promise<PrinterDeviceInfo | null> {
    if (!saved.id) return null;
    const printer = this.ensurePrinter();
    const connected = this.waitForConnection(8_000);
    await printer.reconnect({ id: saved.id });
    return connected;
  }

  async print(bytes: Uint8Array): Promise<void> {
    if (!this.printer || !this.device) throw new Error("La impresora Bluetooth no está conectada.");
    await this.printer.print(bytes);
  }

  async disconnect(): Promise<void> {
    await this.printer?.disconnect();
    this.device = null;
  }

  isConnected(): boolean {
    return this.device !== null;
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }
}

function toDevice(event: BluetoothReceiptPrinterDevice): PrinterDeviceInfo {
  return {
    type: "ble",
    name: event.name || "Impresora Bluetooth",
    id: event.id,
    language: event.language,
    codepageMapping: event.codepageMapping,
    columns: event.columns,
  };
}
