import type { DailyPrice } from "@/types/dailyPrice";
import type { CashCut } from "@/types/report";
import type { LocalTicket, OutboxRecord } from "@/types/sale";

export const BACKUP_FORMAT = "polleria-backup";
export const BACKUP_VERSION = 1;

export interface BackupCounts {
  tickets: number;
  outbox: number;
  cashCuts: number;
  dailyPrices: number;
}

export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  counts: BackupCounts;
  /** Último folio local para no repetirlo al restaurar en otro dispositivo. */
  lastLocalFolio: number;
  tickets: LocalTicket[];
  outbox: OutboxRecord[];
  cashCuts: CashCut[];
  dailyPrices: DailyPrice[];
}

export interface RestoreCount {
  added: number;
  skipped: number;
}

export interface RestoreResult {
  tickets: RestoreCount;
  outbox: RestoreCount;
  cashCuts: RestoreCount;
  dailyPrices: RestoreCount;
  lastLocalFolio: number;
}
