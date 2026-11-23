import type { PolleriaDb } from "@/lib/db";
import { isAuthError } from "@/lib/syncPolicy";

export interface VoidDrainOptions {
  db: PolleriaDb;
  post: (clientOrderUuid: string, reason: string) => Promise<unknown>;
}

export interface VoidDrainSummary {
  synced: number;
  failed: number;
  auth: boolean;
}

/** Reintenta las anulaciones que no llegaron al backend. */
export async function drainVoids(options: VoidDrainOptions): Promise<VoidDrainSummary> {
  const summary: VoidDrainSummary = { synced: 0, failed: 0, auth: false };
  const pending = (await options.db.tickets.toArray()).filter(
    (ticket) => ticket.voidPending === true,
  );

  for (const ticket of pending) {
    try {
      await options.post(ticket.clientOrderUuid, ticket.voidReason ?? "Anulación");
      await options.db.tickets.update(ticket.clientOrderUuid, {
        voidPending: false,
        voidLastError: null,
      });
      summary.synced += 1;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      await options.db.tickets.update(ticket.clientOrderUuid, { voidLastError: message });
      if (isAuthError(error)) {
        summary.auth = true;
        break;
      }
      summary.failed += 1;
    }
  }

  return summary;
}
