import { validateCatalogPayload } from "@/lib/catalog";
import type { Catalog, PriceTier } from "@/types/catalog";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type AdminApiErrorCode = "TIMEOUT" | "NETWORK" | "HTTP" | "INVALID_JSON";

export class AdminApiError extends Error {
  readonly code: AdminApiErrorCode;
  readonly status?: number;

  constructor(code: AdminApiErrorCode, message: string, status?: number) {
    super(message);
    this.name = "AdminApiError";
    this.code = code;
    this.status = status;
  }
}

export interface AdminPriceInput {
  tier: PriceTier;
  price: string;
  is_default: boolean;
}

export interface AdminProductUpdate {
  active?: boolean;
  prices?: AdminPriceInput[];
}

export interface AdminRequestOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

async function adminRequest(
  path: string,
  adminKey: string,
  init: RequestInit,
  options: AdminRequestOptions,
): Promise<unknown> {
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
      response = await fetchImpl(`${baseUrl.replace(/\/+$/, "")}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "X-Admin-Key": adminKey,
          ...init.headers,
        },
      });
    } catch {
      if (controller.signal.aborted) {
        throw new AdminApiError("TIMEOUT", `La API no respondió en ${timeoutMs / 1000} s`);
      }
      throw new AdminApiError("NETWORK", "No se pudo contactar la API");
    }

    if (!response.ok) {
      throw new AdminApiError("HTTP", `La API respondió ${response.status}`, response.status);
    }

    try {
      return await response.json();
    } catch {
      throw new AdminApiError("INVALID_JSON", "La API devolvió un JSON inválido");
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Catálogo completo, incluidos los productos inactivos. */
export async function fetchAdminCatalog(
  adminKey: string,
  options: AdminRequestOptions = {},
): Promise<Catalog> {
  const raw = await adminRequest("/admin/catalog", adminKey, { method: "GET" }, options);
  const result = validateCatalogPayload(raw);
  if (!result.ok) {
    throw new AdminApiError("INVALID_JSON", result.error.detail);
  }
  return result.catalog;
}

/** Guarda estado y/o precios; el backend avanza la versión del catálogo. */
export async function updateAdminProduct(
  productId: string,
  update: AdminProductUpdate,
  adminKey: string,
  options: AdminRequestOptions = {},
): Promise<void> {
  await adminRequest(
    `/admin/products/${encodeURIComponent(productId)}`,
    adminKey,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    },
    options,
  );
}
