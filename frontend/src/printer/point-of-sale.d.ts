interface Navigator {
  /** Web Bluetooth no está en lib.dom; la detección real se hace en runtime. */
  bluetooth?: unknown;
  /** WebUSB no está en lib.dom; la detección real se hace en runtime. */
  usb?: unknown;
}

declare module "@point-of-sale/webbluetooth-receipt-printer" {  export interface BluetoothReceiptPrinterDevice {
    type: "bluetooth";
    name: string;
    id: string;
    language: string;
    codepageMapping: Record<string, number> | string;
    columns?: number;
  }

  export default class WebBluetoothReceiptPrinter {
    constructor(options?: { renderer?: unknown; rendererOptions?: Record<string, unknown> });
    connect(): Promise<void>;
    reconnect(device: { id?: string }): Promise<void>;
    print(data: Uint8Array | number[]): Promise<void>;
    disconnect(): Promise<void>;
    listen(): Promise<boolean>;
    addEventListener(
      type: "connected",
      listener: (device: BluetoothReceiptPrinterDevice) => void,
    ): void;
    addEventListener(type: "disconnected", listener: () => void): void;
    addEventListener(type: "data", listener: (data: DataView) => void): void;
  }
}

declare module "@point-of-sale/webusb-receipt-printer" {
  export interface UsbReceiptPrinterDevice {
    type: "usb";
    manufacturerName: string;
    productName: string;
    serialNumber: string | null;
    vendorId: number;
    productId: number;
    language: string;
    codepageMapping: Record<string, number> | string;
    columns?: number;
  }

  export default class WebUSBReceiptPrinter {
    constructor(options?: { renderer?: unknown; rendererOptions?: Record<string, unknown> });
    connect(): Promise<void>;
    reconnect(device: {
      serialNumber?: string | null;
      vendorId?: number;
      productId?: number;
    }): Promise<void>;
    print(data: Uint8Array | number[]): Promise<void>;
    disconnect(): Promise<void>;
    listen(): Promise<boolean>;
    addEventListener(type: "connected", listener: (device: UsbReceiptPrinterDevice) => void): void;
    addEventListener(type: "disconnected", listener: () => void): void;
    addEventListener(type: "data", listener: (data: DataView) => void): void;
  }
}
