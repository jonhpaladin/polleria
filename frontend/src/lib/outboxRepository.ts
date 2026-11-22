import type { PolleriaDb } from "@/lib/db";
import type { OutboxRecord } from "@/types/sale";

export interface OutboxCounts {
  pending: number;
  failed: number;
}

export async function readOutboxCounts(db: PolleriaDb): Promise<OutboxCounts> {
  const [pending, failed] = await Promise.all([
    db.outbox.where("status").equals("pending").count(),
    db.outbox.where("status").equals("failed").count(),
  ]);
  return { pending, failed };
}

/** Pendientes vencidos, del más antiguo al más nuevo. */
export async function listDuePending(
  db: PolleriaDb,
  nowIso: string,
  limit: number,
): Promise<OutboxRecord[]> {
  const pending = await db.outbox.where("status").equals("pending").toArray();
  return pending
    .filter((record) => !record.nextAttemptAt || record.nextAttemptAt <= nowIso)
    .sort((left, right) => left.enqueuedAt.localeCompare(right.enqueuedAt))
    .slice(0, limit);
}

export async function markSynced(db: PolleriaDb, clientOrderUuid: string): Promise<void> {
  await db.outbox.delete(clientOrderUuid);
}

export async function markRetried(
  db: PolleriaDb,
  clientOrderUuid: string,
  attempts: number,
  nextAttemptAt: string,
  lastError: string,
): Promise<void> {
  await db.outbox.update(clientOrderUuid, {
    status: "pending",
    attempts,
    nextAttemptAt,
    lastError,
  });
}

export async function markFailed(
  db: PolleriaDb,
  clientOrderUuid: string,
  attempts: number,
  lastError: string,
): Promise<void> {
  await db.outbox.update(clientOrderUuid, {
    status: "failed",
    attempts,
    nextAttemptAt: null,
    lastError,
  });
}

/** Devuelve los fallidos a la cola; la UI los reenvía en la siguiente pasada. */
export async function resetFailed(db: PolleriaDb): Promise<number> {
  return db.outbox.where("status").equals("failed").modify({
    status: "pending",
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
  });
}
