import { describe, expect, it, vi } from "vitest";

import { AdminApiError, fetchAdminCatalog, updateAdminProduct } from "@/lib/adminApi";
import { makeWireCatalog } from "@/test/fixtures";

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

describe("fetchAdminCatalog", () => {
  it("pide el catálogo completo con la clave de administración", async () => {
    const payload = makeWireCatalog();
    const fetchImpl = vi.fn(async () => jsonResponse(payload));

    const catalog = await fetchAdminCatalog("clave-admin", {
      baseUrl: "http://api.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(catalog.products).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/admin/catalog",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-Admin-Key": "clave-admin" }),
      }),
    );
  });

  it("convierte un 401 en un error tipado para volver a pedir la clave", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 401));

    await expect(
      fetchAdminCatalog("mala", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "HTTP", status: 401 });
  });

  it("rechaza un catálogo inválido", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ updated_at: "x", products: [] }));

    await expect(
      fetchAdminCatalog("clave", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(AdminApiError);
  });
});

describe("updateAdminProduct", () => {
  it("envía estado y precios por PUT", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));

    await updateAdminProduct(
      "prd-pierna",
      { active: false, prices: [{ tier: "lista", price: "52.00", is_default: true }] },
      "clave-admin",
      { baseUrl: "http://api.test", fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/admin/products/prd-pierna",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Admin-Key": "clave-admin",
        }),
        body: JSON.stringify({
          active: false,
          prices: [{ tier: "lista", price: "52.00", is_default: true }],
        }),
      }),
    );
  });
});
