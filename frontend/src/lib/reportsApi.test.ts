import { describe, expect, it, vi } from "vitest";

import { fetchDailyReport } from "@/lib/reportsApi";

const body = {
  business_date: "2026-11-22",
  ticket_count: 1,
  total: "440.00",
  by_payment_method: { cash: "440.00", card: "0.00", transfer: "0.00" },
  products: [],
  categories: [],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe("fetchDailyReport", () => {
  it("consulta el reporte del día y devuelve el contrato", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(body));

    const result = await fetchDailyReport("2026-11-22", {
      baseUrl: "http://api.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual(body);
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://api.test/reports/daily?business_date=2026-11-22");
  });

  it("devuelve null si la API responde con error", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "boom" }, 500));

    await expect(
      fetchDailyReport("2026-11-22", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBeNull();
  });

  it("devuelve null si la red falla", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      fetchDailyReport("2026-11-22", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBeNull();
  });

  it("devuelve null si el JSON no cumple el contrato", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ total: 440 }));

    await expect(
      fetchDailyReport("2026-11-22", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBeNull();
  });
});
