import { useCallback, useEffect, useRef, useState } from "react";

import { getDb, type PolleriaDb } from "@/lib/db";
import { readOutboxCounts } from "@/lib/outboxRepository";
import { postTicket } from "@/lib/syncApi";
import { drainOutbox, retryFailedOutbox } from "@/lib/syncEngine";
import type { TicketWire } from "@/types/sale";

export interface UseSyncOptions {
  online: boolean;
  db?: PolleriaDb;
  post?: (payload: TicketWire) => Promise<unknown>;
  pollMs?: number;
}

export interface UseSyncResult {
  pending: number;
  failed: number;
  syncing: boolean;
  lastError: string | null;
  drain: () => Promise<void>;
  retryFailed: () => Promise<void>;
  nudge: () => void;
}

/**
 * Sincronizador de segundo plano: drena al arrancar, al recuperar conexión, al
 * cobrar y cada `pollMs`. Nunca se espera desde el cobro (P1).
 */
export function useSync(options: UseSyncOptions): UseSyncResult {
  const { online, pollMs = 30_000 } = options;
  const [deps] = useState(() => ({
    db: options.db ?? getDb(),
    post: options.post ?? ((payload: TicketWire) => postTicket(payload)),
  }));
  const [counts, setCounts] = useState({ pending: 0, failed: 0 });
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setCounts(await readOutboxCounts(deps.db));
    } catch (error) {
      console.warn("OUTBOX_COUNT_FAILED", error);
    }
  }, [deps]);

  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setSyncing(true);
    try {
      const summary = await drainOutbox({ db: deps.db, post: deps.post });
      setLastError(
        summary.retried > 0 ? "No se pudo contactar la API; se reintentará solo." : null,
      );
    } catch (error) {
      console.warn("SYNC_DRAIN_FAILED", error);
      setLastError("No se pudo leer la cola de sincronización.");
    } finally {
      running.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [deps, refresh]);

  const retryFailed = useCallback(async () => {
    await retryFailedOutbox(deps.db);
    await drain();
  }, [deps, drain]);

  /** Tras un cobro: envía si hay red o, si no, solo actualiza el contador. */
  const nudge = useCallback(() => {
    if (online) void drain();
    else void refresh();
  }, [online, drain, refresh]);

  useEffect(() => {
    // Se difiere un tick para no encadenar renders dentro del efecto de montaje.
    const start = setTimeout(() => {
      if (online) void drain();
      else void refresh();
    }, 0);
    return () => clearTimeout(start);
  }, [online, drain, refresh]);

  useEffect(() => {
    if (!online) return;
    const timer = setInterval(() => void drain(), pollMs);
    return () => clearInterval(timer);
  }, [online, drain, pollMs]);

  return {
    pending: counts.pending,
    failed: counts.failed,
    syncing,
    lastError,
    drain,
    retryFailed,
    nudge,
  };
}
