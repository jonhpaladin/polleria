import { businessDate } from "@/lib/dailyPrices";
import type { PolleriaDb } from "@/lib/db";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupPayload,
  type RestoreResult,
} from "@/types/backup";

export const BACKUP_FILENAME_PREFIX = "polleria-respaldo";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS = new Set(["cash", "card", "transfer"]);
const PRICE_SOURCES = new Set(["lista", "promocion", "mayoreo", "manual"]);

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

function isInt(value: unknown, minimum = 0): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isOptionalMoney(value: unknown): boolean {
  return value === null || isInt(value, 1);
}

function isLine(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isString(value.lineId) &&
    isString(value.productId) &&
    isString(value.sku) &&
    isString(value.name) &&
    isString(value.categoryName) &&
    (value.unit === "kg" || value.unit === "piece") &&
    isInt(value.quantity, 1) &&
    (value.grams === null || isInt(value.grams, 1)) &&
    typeof value.priceSource === "string" &&
    PRICE_SOURCES.has(value.priceSource) &&
    isInt(value.catalogUnitPriceCents) &&
    isInt(value.unitPriceCents) &&
    isInt(value.lineTotalCents)
  );
}

function isTicket(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    isString(value.clientOrderUuid) &&
    isInt(value.localFolio, 1) &&
    isIsoDate(value.soldAtUtc) &&
    isDate(value.businessDate) &&
    typeof value.paymentMethod === "string" &&
    PAYMENT_METHODS.has(value.paymentMethod) &&
    Array.isArray(value.lines) &&
    value.lines.length > 0 &&
    value.lines.every(isLine) &&
    isInt(value.totalCents, 1) &&
    value.status === "confirmed" &&
    isString(value.catalogUpdatedAt)
  );
}

function isWireLine(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.line_id) &&
    isString(value.product_id) &&
    isString(value.sku) &&
    isString(value.name) &&
    isString(value.category_name) &&
    (value.unit === "kg" || value.unit === "piece")
  );
}

function isOutbox(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.payload)) return false;
  const payload = value.payload;
  return (
    value.schemaVersion === 1 &&
    isString(value.clientOrderUuid) &&
    (value.status === "pending" || value.status === "failed") &&
    isIsoDate(value.enqueuedAt) &&
    (value.attempts === undefined || isInt(value.attempts)) &&
    (value.nextAttemptAt === undefined ||
      value.nextAttemptAt === null ||
      isIsoDate(value.nextAttemptAt)) &&
    (value.lastError === undefined ||
      value.lastError === null ||
      typeof value.lastError === "string") &&
    payload.schema_version === 1 &&
    payload.client_order_uuid === value.clientOrderUuid &&
    isDate(payload.business_date) &&
    typeof payload.payment_method === "string" &&
    PAYMENT_METHODS.has(payload.payment_method) &&
    Array.isArray(payload.lines) &&
    payload.lines.every(isWireLine) &&
    typeof payload.total === "string" &&
    isString(payload.catalog_updated_at)
  );
}

function isCashCut(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.byPayment)) return false;
  return (
    isDate(value.businessDate) &&
    isInt(value.openingCashCents) &&
    isInt(value.countedCashCents) &&
    isInt(value.expectedCashCents) &&
    typeof value.differenceCents === "number" &&
    Number.isInteger(value.differenceCents) &&
    isInt(value.ticketCount) &&
    isInt(value.totalCents) &&
    isInt(value.byPayment.cash) &&
    isInt(value.byPayment.card) &&
    isInt(value.byPayment.transfer) &&
    isIsoDate(value.closedAtUtc) &&
    (value.recalculatedAtUtc === null || isIsoDate(value.recalculatedAtUtc))
  );
}

function isDailyPrice(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isDate(value.businessDate) &&
    isString(value.productId) &&
    (value.unit === "kg" || value.unit === "piece") &&
    isInt(value.normalPriceCents, 1) &&
    isOptionalMoney(value.promotionPriceCents) &&
    isOptionalMoney(value.wholesalePriceCents) &&
    isIsoDate(value.updatedAtUtc)
  );
}

function countsOf(backup: Pick<BackupPayload, "tickets" | "outbox" | "cashCuts" | "dailyPrices">) {
  return {
    tickets: backup.tickets.length,
    outbox: backup.outbox.length,
    cashCuts: backup.cashCuts.length,
    dailyPrices: backup.dailyPrices.length,
  };
}

export type BackupValidation =
  | { ok: true; backup: BackupPayload }
  | { ok: false; error: string };

/** Valida el archivo completo antes de tocar IndexedDB. */
export function validateBackup(raw: unknown): BackupValidation {
  if (!isRecord(raw)) {
    return { ok: false, error: "El archivo no es un respaldo de Pollería El Wero." };
  }
  if (raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: "El archivo no es un respaldo de Pollería El Wero." };
  }
  if (raw.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `La versión del respaldo (${String(raw.version)}) no es compatible con esta app.`,
    };
  }
  if (!isIsoDate(raw.exportedAt)) {
    return { ok: false, error: "El respaldo no tiene una fecha de exportación válida." };
  }
  if (!Array.isArray(raw.tickets) || !raw.tickets.every(isTicket)) {
    return { ok: false, error: "El respaldo tiene tickets inválidos." };
  }
  if (!Array.isArray(raw.outbox) || !raw.outbox.every(isOutbox)) {
    return { ok: false, error: "El respaldo tiene ventas pendientes inválidas." };
  }
  if (!Array.isArray(raw.cashCuts) || !raw.cashCuts.every(isCashCut)) {
    return { ok: false, error: "El respaldo tiene cortes de caja inválidos." };
  }
  if (!Array.isArray(raw.dailyPrices) || !raw.dailyPrices.every(isDailyPrice)) {
    return { ok: false, error: "El respaldo tiene hojas de precios inválidas." };
  }

  const maxTicketFolio = Math.max(
    0,
    ...raw.tickets.map((ticket) => (ticket as RecordValue).localFolio as number),
  );
  const lastLocalFolio =
    isInt(raw.lastLocalFolio) ? Math.max(raw.lastLocalFolio, maxTicketFolio) : maxTicketFolio;

  const backup: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: String(raw.exportedAt),
    counts: countsOf({
      tickets: raw.tickets as BackupPayload["tickets"],
      outbox: raw.outbox as BackupPayload["outbox"],
      cashCuts: raw.cashCuts as BackupPayload["cashCuts"],
      dailyPrices: raw.dailyPrices as BackupPayload["dailyPrices"],
    }),
    lastLocalFolio,
    tickets: raw.tickets as BackupPayload["tickets"],
    outbox: raw.outbox as BackupPayload["outbox"],
    cashCuts: raw.cashCuts as BackupPayload["cashCuts"],
    dailyPrices: raw.dailyPrices as BackupPayload["dailyPrices"],
  };
  return { ok: true, backup };
}

export async function buildBackup(db: PolleriaDb, now = new Date()): Promise<BackupPayload> {
  const [tickets, outbox, cashCuts, dailyPrices, sequence] = await Promise.all([
    db.tickets.toArray(),
    db.outbox.toArray(),
    db.cashCuts.toArray(),
    db.dailyPrices.toArray(),
    db.meta.get("ticket-sequence"),
  ]);
  const lastLocalFolio = Math.max(
    sequence?.value.localFolio ?? 0,
    ...tickets.map((ticket) => ticket.localFolio),
  );

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    counts: countsOf({ tickets, outbox, cashCuts, dailyPrices }),
    lastLocalFolio,
    tickets,
    outbox,
    cashCuts,
    dailyPrices,
  };
}

export function backupFileName(now = new Date()): string {
  return `${BACKUP_FILENAME_PREFIX}-${businessDate(now)}.json`;
}

/** Descarga el JSON en el navegador; el archivo no sale del dispositivo. */
export function downloadBackupFile(backup: BackupPayload, now = new Date()): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/** Fusión por llave: lo que ya existe en el dispositivo nunca se pisa. */
export async function restoreBackup(
  db: PolleriaDb,
  backup: BackupPayload,
): Promise<RestoreResult> {
  return db.transaction(
    "rw",
    db.tickets,
    db.outbox,
    db.cashCuts,
    db.dailyPrices,
    db.meta,
    async () => {
      const existingTickets = await db.tickets.bulkGet(
        backup.tickets.map((ticket) => ticket.clientOrderUuid),
      );
      const ticketsToAdd = backup.tickets.filter((_, index) => !existingTickets[index]);
      if (ticketsToAdd.length > 0) await db.tickets.bulkAdd(ticketsToAdd);

      const existingOutbox = await db.outbox.bulkGet(
        backup.outbox.map((record) => record.clientOrderUuid),
      );
      const outboxToAdd = backup.outbox.filter((_, index) => !existingOutbox[index]);
      if (outboxToAdd.length > 0) await db.outbox.bulkAdd(outboxToAdd);

      const existingCuts = await db.cashCuts.bulkGet(
        backup.cashCuts.map((cut) => cut.businessDate),
      );
      const cutsToAdd = backup.cashCuts.filter((_, index) => !existingCuts[index]);
      if (cutsToAdd.length > 0) await db.cashCuts.bulkAdd(cutsToAdd);

      const existingPrices = await db.dailyPrices.bulkGet(
        backup.dailyPrices.map((row) => row.id),
      );
      const pricesToAdd = backup.dailyPrices.filter((_, index) => !existingPrices[index]);
      if (pricesToAdd.length > 0) await db.dailyPrices.bulkAdd(pricesToAdd);

      // El folio local no puede retroceder, o la siguiente venta repetiría uno.
      const sequence = await db.meta.get("ticket-sequence");
      const currentFolio = sequence?.value.localFolio ?? 0;
      const lastLocalFolio = Math.max(currentFolio, backup.lastLocalFolio);
      if (lastLocalFolio > currentFolio) {
        await db.meta.put({
          key: "ticket-sequence",
          value: { updatedAt: "", localFolio: lastLocalFolio },
        });
      }

      return {
        tickets: { added: ticketsToAdd.length, skipped: backup.tickets.length - ticketsToAdd.length },
        outbox: { added: outboxToAdd.length, skipped: backup.outbox.length - outboxToAdd.length },
        cashCuts: { added: cutsToAdd.length, skipped: backup.cashCuts.length - cutsToAdd.length },
        dailyPrices: {
          added: pricesToAdd.length,
          skipped: backup.dailyPrices.length - pricesToAdd.length,
        },
        lastLocalFolio,
      };
    },
  );
}
