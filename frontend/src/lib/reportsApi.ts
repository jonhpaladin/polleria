import type { RemoteDailyReport } from "@/types/report";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface FetchDailyReportOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Consulta el reporte conciliado. Un fallo de red no es error del corte:
 * devuelve `null` y la UI muestra «sin conciliación».
 */
export async function fetchDailyReport(
  businessDate: string,
  options: FetchDailyReportOptions = {},
): Promise<RemoteDailyReport | null> {
  const {
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(
      `${baseUrl.replace(/\/+$/, "")}/reports/daily?business_date=${encodeURIComponent(businessDate)}`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isRemoteReport(body) ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRemoteReport(value: unknown): value is RemoteDailyReport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.business_date === "string" &&
    typeof candidate.ticket_count === "number" &&
    typeof candidate.total === "string" &&
    typeof candidate.by_payment_method === "object" &&
    candidate.by_payment_method !== null &&
    Array.isArray(candidate.products) &&
    Array.isArray(candidate.categories)
  );
}
