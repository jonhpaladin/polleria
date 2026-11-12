import { describe, expect, it, vi } from "vitest";

import { CatalogApiError, fetchCatalog } from "@/lib/api";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

describe("fetchCatalog", () => {
  it("consulta /catalog en la base configurada y devuelve el JSON", async () => {
    const payload = { updated_at: "2026-11-11T18:04:00Z", categories: [], products: [] };
    const fetchImpl = vi.fn(async () => jsonResponse(payload));

    const result = await fetchCatalog({
      baseUrl: "http://api.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual(payload);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/catalog",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("convierte un 5xx en un error tipado", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 500));

    await expect(
      fetchCatalog({ baseUrl: "http://api.test", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "HTTP", status: 500 });
  });

  it("convierte una red caída en un error tipado", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      fetchCatalog({ baseUrl: "http://api.test", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("convierte un JSON inválido en un error tipado", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("JSON truncado");
      },
    }));

    await expect(
      fetchCatalog({ baseUrl: "http://api.test", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("aborta a los 5 s (configurable) con TIMEOUT", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      fetchCatalog({
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("expone un error tipado con código", () => {
    const error = new CatalogApiError("TIMEOUT", "sin respuesta");

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("TIMEOUT");
  });
});
