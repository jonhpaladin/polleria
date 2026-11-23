import { describe, expect, it, vi } from "vitest";

import { postTicket, postVoid, SyncApiError } from "@/lib/syncApi";
import type { TicketWire } from "@/types/sale";

const payload: TicketWire = {
  schema_version: 1,
  client_order_uuid: "11111111-1111-4111-8111-111111111111",
  sold_at_utc: "2026-11-14T18:30:00Z",
  business_date: "2026-11-14",
  payment_method: "cash",
  lines: [],
  total: "0.00",
  catalog_updated_at: "2026-11-11T18:04:00Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("postTicket", () => {
  it("envía el ticket por POST y devuelve el estado del servidor", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        client_order_uuid: payload.client_order_uuid,
        status: "duplicate",
        received_at: "2026-11-14T18:30:04Z",
      }),
    );

    const result = await postTicket(payload, {
      baseUrl: "http://api.test/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.status).toBe("duplicate");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api.test/sync");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      client_order_uuid: payload.client_order_uuid,
    });
  });

  it("conserva el estado HTTP para que la política decida el reintento", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "inválido" }, 422));

    await expect(
      postTicket(payload, {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "HTTP", status: 422 });
  });

  it("traduce una red caída en NETWORK", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(
      postTicket(payload, {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("rechaza una respuesta que no cumple el contrato", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: "ok" }));

    await expect(
      postTicket(payload, {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "INVALID_JSON" });
  });

  it("aborta con TIMEOUT cuando la API no responde", async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      postTicket(payload, {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("expone un error tipado con código y estado", () => {
    const error = new SyncApiError("HTTP", "sin respuesta", 503);

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("HTTP");
    expect(error.status).toBe(503);
  });
});

describe("postVoid", () => {
  it("envía el motivo a la ruta de anulación", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        client_order_uuid: payload.client_order_uuid,
        status: "voided",
        voided_at_utc: "2026-11-22T19:00:00Z",
      }),
    );

    const result = await postVoid(payload.client_order_uuid, "Cobro incorrecto", {
      baseUrl: "http://api.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.status).toBe("voided");
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/sales/${payload.client_order_uuid}/void`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Cobro incorrecto" }),
      }),
    );
  });

  it("trata un 404 como venta que nunca llegó al backend", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 404));

    const result = await postVoid(payload.client_order_uuid, "Cliente canceló", {
      baseUrl: "http://api.test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.status).toBe("not_found");
    expect(result.voided_at_utc).toBeNull();
  });

  it("propaga el 401 para pedir la clave del local", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 401));

    await expect(
      postVoid(payload.client_order_uuid, "Cliente canceló", {
        baseUrl: "http://api.test",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "HTTP", status: 401 });
  });
});
