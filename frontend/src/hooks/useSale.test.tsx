import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useSale } from "@/hooks/useSale";
import { buildBaseDailyPrices } from "@/lib/dailyPrices";
import { getDb } from "@/lib/db";
import { makeCatalog } from "@/test/fixtures";

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
