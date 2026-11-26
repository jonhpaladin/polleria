import { getDb, type PolleriaDb } from "@/lib/db";
import type { PrintJob, PrintReason, PrintTicket } from "@/types/print";

export interface EnqueuePrintOptions {
  db?: PolleriaDb;
  now?: Date;
}

/**
 * Encola un ticket. La impresión automática de una venta se deduplica por UUID;
 * una reimpresión explícita siempre crea un trabajo nuevo.
 */
export async function enqueuePrintJob(
  ticket: PrintTicket,
  reason: PrintReason,
  options: EnqueuePrintOptions = {},
): Promise<PrintJob> {
  const db = options.db ?? getDb();
  const now = options.now ?? new Date();

  if (reason === "sale") {
    const existing = await db.printJobs
      .where("clientOrderUuid")
      .equals(ticket.clientOrderUuid)
      .filter((job) => job.reason === "sale")
      .first();
    if (existing) return existing;
  }

  const job: PrintJob = {
    clientOrderUuid: ticket.clientOrderUuid,
    createdAt: now.toISOString(),
    status: "pending",
    attempts: 0,
    lastError: null,
    ticket,
    printedAtUtc: null,
    reason,
  };
  const id = await db.printJobs.add(job);
  return { ...job, id };
}

/** Toma el pendiente más viejo y lo marca como `printing`. */
export async function claimNextPrintJob(db: PolleriaDb = getDb()): Promise<PrintJob | null> {
  return db.transaction("rw", db.printJobs, async () => {
    const candidates = await db.printJobs.where("status").equals("pending").sortBy("createdAt");
    const next = candidates[0];
    if (!next?.id) return null;
    const updated: PrintJob = {
      ...next,
      status: "printing",
      attempts: next.attempts + 1,
      lastError: null,
    };
    await db.printJobs.put(updated);
    return updated;
  });
}

export async function markPrinted(
  db: PolleriaDb,
  job: PrintJob,
  now = new Date(),
): Promise<void> {
  if (!job.id) return;
  await db.printJobs.update(job.id, {
    status: "printed",
    printedAtUtc: now.toISOString(),
    lastError: null,
  });
}

export async function markFailed(
  db: PolleriaDb,
  job: PrintJob,
  error: string,
): Promise<void> {
  if (!job.id) return;
  await db.printJobs.update(job.id, {
    status: "failed",
    lastError: error,
  });
}

/**
 * La impresión no es idempotente: si se corta a media escritura, no sabemos si
 * salió. Este estado exige que el cajero confirme antes de reintentar.
 */
export async function markUncertain(
  db: PolleriaDb,
  job: PrintJob,
  error: string,
): Promise<void> {
  if (!job.id) return;
  await db.printJobs.update(job.id, {
    status: "uncertain",
    lastError: error,
  });
}

export async function retryPrintJob(db: PolleriaDb, id: number): Promise<void> {
  await db.printJobs.update(id, {
    status: "pending",
    lastError: null,
  });
}

export async function discardPrintJob(db: PolleriaDb, id: number): Promise<void> {
  await db.printJobs.delete(id);
}

/** Un cierre inesperado de la app deja `printing`; se convierte en `uncertain`. */
export async function recoverInterruptedPrintJobs(db: PolleriaDb = getDb()): Promise<number> {
  return db.transaction("rw", db.printJobs, async () => {
    const interrupted = await db.printJobs.where("status").equals("printing").toArray();
    for (const job of interrupted) {
      if (job.id) {
        await db.printJobs.update(job.id, {
          status: "uncertain",
          lastError: "La app se cerró durante la impresión.",
        });
      }
    }
    return interrupted.length;
  });
}

export interface PrintQueueCounts {
  pending: number;
  failed: number;
  uncertain: number;
}

export async function listAttentionPrintJobs(db: PolleriaDb = getDb()): Promise<PrintJob[]> {
  return db.printJobs
    .where("status")
    .anyOf(["failed", "uncertain"])
    .sortBy("createdAt");
}

export async function printQueueCounts(db: PolleriaDb = getDb()): Promise<PrintQueueCounts> {
  const [pending, failed, uncertain] = await Promise.all([
    db.printJobs.where("status").equals("pending").count(),
    db.printJobs.where("status").equals("failed").count(),
    db.printJobs.where("status").equals("uncertain").count(),
  ]);
  return { pending, failed, uncertain };
}
