import type { PolleriaDb } from "@/lib/db";
import {
  listDuePending,
  markFailed,
  markRetried,
  markSynced,
  resetFailed,
} from "@/lib/outboxRepository";
import { backoffDelayMs, isPermanentSyncError } from "@/lib/syncPolicy";
import type { TicketWire } from "@/types/sale";

export interface DrainOptions {
  db: PolleriaDb;
  post: (payload: TicketWire) => Promise<unknown>;
  now?: () => Date;
  random?: () => number;
  batchSize?: number;
}

export interface DrainSummary {
  synced: number;
  retried: number;
  failed: number;
}

const DEFAULT_BATCH_SIZE = 20;

/**
 * Una pasada del outbox. Un fallo definitivo no frena a los demás tickets y un
 * fallo recuperable queda agendado; la función no usa relojes ni timers propios.
 */
export async function drainOutbox(options: DrainOptions): Promise<DrainSummary> {
  const now = options.now ?? (() => new Date());
  const random = options.random ?? Math.random;
  const summary: DrainSummary = { synced: 0, retried: 0, failed: 0 };
  const startedAt = now().toISOString();
  const batch = await listDuePending(options.db, startedAt, options.batchSize ?? DEFAULT_BATCH_SIZE);

  for (const record of batch) {
    const attempts = (record.attempts ?? 0) + 1;
    try {
      await options.post(record.payload);
      await markSynced(options.db, record.clientOrderUuid);
      summary.synced += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      if (isPermanentSyncError(error)) {
        await markFailed(options.db, record.clientOrderUuid, attempts, message);
        summary.failed += 1;
      } else {
        const delay = backoffDelayMs(attempts, random);
        const nextAttemptAt = new Date(now().getTime() + delay).toISOString();
        await markRetried(options.db, record.clientOrderUuid, attempts, nextAttemptAt, message);
        summary.retried += 1;
      }
    }
  }

  return summary;
}

/** Devuelve los tickets fallidos a la cola para un reintento manual. */
export async function retryFailedOutbox(db: PolleriaDb): Promise<number> {
  return resetFailed(db);
}
