import { SyncApiError } from "@/lib/syncApi";

export const SYNC_BASE_DELAY_MS = 2_000;
export const SYNC_MAX_DELAY_MS = 300_000;

/**
 * Un 4xx de validación es definitivo: reintentarlo no cambia el dato. Se
 * exceptúan 401/403 (clave del local), 408 (timeout del servidor) y 429
 * (demasiadas solicitudes).
 */
export function isPermanentSyncError(error: unknown): boolean {
  if (!(error instanceof SyncApiError)) return false;
  if (error.code !== "HTTP" || error.status === undefined) return false;
  const status = error.status;
  return (
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 403 &&
    status !== 408 &&
    status !== 429
  );
}

/** Un 401/403 pide configurar o corregir la clave del local; no es un dato inválido. */
export function isAuthError(error: unknown): boolean {
  return (
    error instanceof SyncApiError &&
    error.code === "HTTP" &&
    (error.status === 401 || error.status === 403)
  );
}

/**
 * Backoff exponencial con jitter entre 50 % y 100 % del techo. `random` se
 * inyecta en los tests para no depender del azar.
 */
export function backoffDelayMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const safeAttempt = Number.isFinite(attempt) ? Math.max(1, Math.trunc(attempt)) : 1;
  const exponent = Math.min(safeAttempt - 1, 16);
  const ceiling = Math.min(SYNC_MAX_DELAY_MS, SYNC_BASE_DELAY_MS * 2 ** exponent);
  const jitter = 0.5 + random() * 0.5;
  return Math.round(ceiling * jitter);
}
