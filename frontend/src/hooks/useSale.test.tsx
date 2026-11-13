import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSale } from "@/hooks/useSale";
import { buildBaseDailyPrices, businessDate } from "@/lib/dailyPrices";
import { getDb } from "@/lib/db";
import { makeCatalog } from "@/test/fixtures";

vi.mock("@/lib/ticketRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ticketRepository")>();
  return { ...actual, persistTicket: vi.fn(actual.persistTicket) };
});

import { persistTicket } from "@/lib/ticketRepository";

const catalog = makeCatalog();
const dailyPrices = buildBaseDailyPrices(
  catalog,
  "2026-11-13",
  "2026-11-13T15:00:00.000Z",
);

afterEach(async () => {
  const db = getDb();
  await db.tickets.clear();
  await db.outbox.clear();
  await db.meta.clear();
});

describe("useSale", () => {
  it("agrega desde la hoja del día y confirma con total, método y folio", async () => {
    const { result } = renderHook(() => useSale(catalog, dailyPrices, true));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));
    expect(result.current.cart.lines[0]).toMatchObject({
      unitPriceCents: 15000,
      lineTotalCents: 15000,
    });

    await act(async () => {
      await result.current.checkout();
    });

    await waitFor(() =>
      expect(result.current.success).toBe(
        "Venta confirmada: $150.00 en Efectivo. Folio local 1.",
      ),
    );
    expect(result.current.cart.lines).toHaveLength(0);
    expect(await getDb().tickets.count()).toBe(1);
  });

  it("conserva el carrito y avisa cuando falla la escritura local", async () => {
    vi.mocked(persistTicket).mockRejectedValueOnce(new Error("Cuota excedida"));
    const { result } = renderHook(() => useSale(catalog, dailyPrices, true));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));
    await act(async () => {
      await result.current.checkout();
    });

    expect(result.current.error).toBe(
      "No se pudo guardar la venta. No se cobró nada; vuelve a intentar.",
    );
    expect(result.current.success).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(result.current.cart.lines).toHaveLength(1);
    expect(await getDb().tickets.count()).toBe(0);
  });

  it("dos confirmaciones simultáneas crean un solo ticket y outbox", async () => {
    const { result } = renderHook(() => useSale(catalog, dailyPrices, true));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));

    await act(async () => {
      await Promise.all([result.current.checkout(), result.current.checkout()]);
    });

    await waitFor(() => expect(result.current.success).not.toBeNull());
    expect(await getDb().tickets.count()).toBe(1);
    expect(await getDb().outbox.count()).toBe(1);
  });

  it("no agrega productos si la hoja del día aún no está disponible", () => {
    const { result } = renderHook(() => useSale(catalog, [], false));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));

    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.error).toContain("Precios del día");
  });

  it("bloquea agregar y cobrar si la hoja es de ayer aunque el render diga que es hoy", async () => {
    const yesterday = businessDate(new Date(Date.now() - 86_400_000));
    const { result } = renderHook(() => useSale(catalog, dailyPrices, true, true, yesterday));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));
    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.error).toContain("no son de hoy");

    await act(async () => {
      await result.current.checkout();
    });
    expect(result.current.error).toContain("no son de hoy");
    expect(await getDb().tickets.count()).toBe(0);
  });

  it("bloquea agregar y cobrar cuando la hoja no es de hoy", async () => {
    const { result } = renderHook(() => useSale(catalog, dailyPrices, true, false));

    act(() => result.current.addProduct("prd-pierna", "Pollo"));

    expect(result.current.cart.lines).toHaveLength(0);
    expect(result.current.error).toContain("no son de hoy");
    expect(result.current.canCheckout).toBe(false);

    await act(async () => {
      await result.current.checkout();
    });
    expect(result.current.error).toContain("no son de hoy");
    expect(await getDb().tickets.count()).toBe(0);
  });
});
