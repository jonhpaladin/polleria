import type {
  PrinterConnectionType,
  PrinterDeviceInfo,
  SavedPrinterDevice,
} from "@/types/print";

export interface PrinterAdapter {
  readonly type: PrinterConnectionType;
  connect(): Promise<PrinterDeviceInfo | null>;
  reconnect(device: SavedPrinterDevice): Promise<PrinterDeviceInfo | null>;
  print(bytes: Uint8Array): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  onDisconnect(listener: () => void): () => void;
}
