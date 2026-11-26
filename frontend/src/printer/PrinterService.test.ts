import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDb, type PolleriaDb } from "@/lib/db";
import { PrinterService } from "@/printer/PrinterService";
import type { PrinterAdapter } from "@/printer/adapters/types";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";
import type { PrinterDeviceInfo } from "@/types/print";

const openDbs: PolleriaDb[] = [];
let counter = 0;

function newDb(): PolleriaDb {
  const db = createDb(`polleria-printer-service-${counter++}`);
  openDbs.push(db);
  return db;
}

afterEach(async () => {
  for (const db of openDbs.splice(0)) {
    db.close();
    await Dexie.delete(db.name);
  }
});

beforeEach(() => {
  localStorage.clear();
});

function ticket(uuid = "11111111-1111-4111-8111-111111111111"): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid: uuid,
    localFolio: 9,
    soldAtUtc: "2026-11-25T18:45:00.000Z",
    businessDate: "2026-11-25",
    paymentMethod: "cash",
    lines: [
      {
        lineId: "line-1",
        productId: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        categoryName: "Pollo",
        unit: "kg",
        quantity: 1,
        grams: 500 as never,
        priceSource: "lista",
        catalogUnitPriceCents: 15000 as Cents,
        unitPriceCents: 15000 as Cents,
        lineTotalCents: 7500 as Cents,
      },
    ],
    totalCents: 7500 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-25T18:00:00.000Z",
  };
}

class FakeAdapter implements PrinterAdapter {
  readonly type: "ble";
  connected = false;
  bytes: Uint8Array[] = [];
  onPrint?: (adapter: FakeAdapter) => void;
  private readonly disconnectListeners = new Set<() => void>();

  constructor(type: "ble" = "ble") {
    this.type = type;
  }

  async connect(): Promise<PrinterDeviceInfo> {
    this.connected = true;
    return device();
  }

  async reconnect(): Promise<PrinterDeviceInfo> {
    this.connected = true;
    return device();
  }

  async print(bytes: Uint8Array): Promise<void> {
    this.bytes.push(bytes);
    this.onPrint?.(this);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  emitDisconnect(): void {
    this.connected = false;
    for (const listener of this.disconnectListeners) listener();
  }
}

function device(): PrinterDeviceInfo {
  return {
    type: "ble",
    name: "Impresora de prueba",
    id: "device-1",
    language: "esc-pos",
    codepageMapping: "epson",
  };
}

function makeService(db: PolleriaDb, adapter = new FakeAdapter()) {
  const usb = new FakeAdapter();
  const browserPrint = vi.fn();
  const service = new PrinterService({
    db,
    ble: adapter,
    usb,
    supported: { ble: true, usb: true },
    browserPrint,
    now: () => new Date("2026-11-25T18:50:00.000Z"),
  });
  return { service, adapter, browserPrint };
}

describe("PrinterService", () => {
  it("conecta, imprime y deja el trabajo en printed", async () => {
    const db = newDb();
    const { service, adapter } = makeService(db);

    await service.connect("ble");
    expect(service.getState().status).toBe("connected");

    await service.printTicket(ticket(), "sale");

    expect(adapter.bytes).toHaveLength(1);
    expect(service.getState().status).toBe("connected");
    const jobs = await db.printJobs.toArray();
    expect(jobs[0]?.status).toBe("printed");
    expect(service.getState().pending).toBe(0);
  });

  it("guarda el ticket pendiente cuando no hay impresora", async () => {
    const db = newDb();
    const { service } = makeService(db);

    await service.printTicket(ticket(), "sale");

    const jobs = await db.printJobs.toArray();
    expect(jobs[0]?.status).toBe("pending");
    expect(service.getState().pending).toBe(1);
    expect(service.getState().message).toContain("guardado");
  });

  it("marca uncertain si la impresora se desconecta durante la impresión", async () => {
    const db = newDb();
    const { service, adapter } = makeService(db);
    await service.connect("ble");
    adapter.onPrint = (current) => current.emitDisconnect();

    await service.printTicket(ticket(), "sale");

    const jobs = await db.printJobs.toArray();
    expect(jobs[0]?.status).toBe("uncertain");
    expect(service.getState().uncertain).toBe(1);
    expect(service.getState().pending).toBe(0);
  });

  it("usa la impresión del sistema cuando no hay impresora", async () => {
    const db = newDb();
    const { service, browserPrint } = makeService(db);

    await service.printTest();

    expect(browserPrint).toHaveBeenCalledTimes(1);
  });

  it("no duplica la impresión automática de la misma venta", async () => {
    const db = newDb();
    const { service, adapter } = makeService(db);
    await service.connect("ble");

    await service.printTicket(ticket(), "sale");
    await service.printTicket(ticket(), "sale");

    expect(adapter.bytes).toHaveLength(1);
    expect(await db.printJobs.count()).toBe(1);
  });
});
