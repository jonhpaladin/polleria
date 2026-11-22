import type { TicketWire } from "@/types/sale";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type SyncApiErrorCode = "TIMEOUT" | "NETWORK" | "HTTP" | "INVALID_JSON";

export class SyncApiError extends Error {
  readonly code: SyncApiErrorCode;
  readonly status?: number;

  constructor(code: SyncApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "SyncApiError";
    this.code = code;
    this.status = status;
  }
}

export interface SyncResponse {
  client_order_uuid: string;
  status: "created" | "duplicate";
  received_at: string;
}

export interface PostTicketOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Envía un ticket a `POST /sync`. Un fallo se traduce a `SyncApiError`; la
 * política de reintentos no vive aquí para que el motor sea puro y testeable.
 */
export async function postTicket(
  payload: TicketWire,
  options: PostTicketOptions = {},
): Promise<SyncResponse> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/sync`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      if (controller.signal.aborted) {
        throw new SyncApiError("TIMEOUT", `La API no respondió en ${timeoutMs / 1000} s`);
      }
      throw new SyncApiError("NETWORK", "No se pudo contactar la API");
    }

    if (!response.ok) {
      throw new SyncApiError("HTTP", `La API respondió ${response.status}`, response.status);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new SyncApiError("INVALID_JSON", "La API devolvió un JSON inválido");
    }
    if (!isSyncResponse(body)) {
      throw new SyncApiError("INVALID_JSON", "La API devolvió una respuesta inesperada");
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

function isSyncResponse(value: unknown): value is SyncResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.client_order_uuid === "string" &&
    (candidate.status === "created" || candidate.status === "duplicate") &&
    typeof candidate.received_at === "string"
  );
}
