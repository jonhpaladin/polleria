const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type CatalogApiErrorCode = "TIMEOUT" | "NETWORK" | "HTTP" | "INVALID_JSON";

export class CatalogApiError extends Error {
  readonly code: CatalogApiErrorCode;
  readonly status?: number;

  constructor(code: CatalogApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "CatalogApiError";
    this.code = code;
    this.status = status;
  }
}

export interface FetchCatalogOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Consulta `GET /catalog` con un `AbortController` de 5 s. Cualquier fallo
 * se traduce a un error tipado: la UI nunca ve una excepción sin manejar.
 */
export async function fetchCatalog(options: FetchCatalogOptions = {}): Promise<unknown> {
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
      response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}/catalog`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
    } catch {
      if (controller.signal.aborted) {
        throw new CatalogApiError("TIMEOUT", `La API no respondió en ${timeoutMs / 1000} s`);
      }
      throw new CatalogApiError("NETWORK", "No se pudo contactar la API");
    }

    if (!response.ok) {
      throw new CatalogApiError("HTTP", `La API respondió ${response.status}`, response.status);
    }

    try {
      return await response.json();
    } catch {
      throw new CatalogApiError("INVALID_JSON", "La API devolvió un JSON inválido");
    }
  } finally {
    clearTimeout(timer);
  }
}
