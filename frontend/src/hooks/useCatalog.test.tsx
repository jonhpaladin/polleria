import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCatalog } from "@/hooks/useCatalog";
import { makeCatalog, makeWireCatalog } from "@/test/fixtures";

describe("useCatalog", () => {
  it("pinta la semilla aunque la red esté caída", async () => {
    const seed = makeCatalog();
    const load = vi.fn(async () => ({ catalog: seed, origin: "seed" as const }));
    const fetchRemote = vi.fn(async () => {
      throw new Error("sin red");
    });

    const { result } = renderHook(() =>
      useCatalog({ seed, load, fetchRemote, save: vi.fn(async () => undefined) }),
    );

    await waitFor(() => expect(result.current.catalog).toEqual(seed));
    expect(result.current.origin).toBe("seed");
    await waitFor(() => expect(result.current.online).toBe(false));
  });

  it("aplica el refresco sin perder la categoría seleccionada", async () => {
    const seed = makeCatalog();
    const updated = makeCatalog({ updated_at: "2026-11-12T09:00:00Z" });
    let resolveFetch: (value: unknown) => void = () => undefined;
    const fetchRemote = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const save = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useCatalog({
        seed,
        load: async () => ({ catalog: seed, origin: "seed" }),
        fetchRemote,
        save,
      }),
    );

    await waitFor(() => expect(result.current.catalog).toEqual(seed));
    act(() => result.current.selectCategory("cat-promos"));

    await act(async () => {
      resolveFetch(makeWireCatalog({ updated_at: "2026-11-12T09:00:00Z" }));
    });

    await waitFor(() => expect(result.current.catalog).toEqual(updated));
    expect(result.current.selectedCategory).toBe("cat-promos");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(updated);
  });

  it("no pisa el catálogo local con un payload inválido", async () => {
    const seed = makeCatalog();
    const save = vi.fn(async () => undefined);
    const fetchRemote = vi.fn(async () => ({ updated_at: "2026-11-12T09:00:00Z" }));

    const { result } = renderHook(() =>
      useCatalog({
        seed,
        load: async () => ({ catalog: seed, origin: "local" }),
        fetchRemote,
        save,
      }),
    );

    await waitFor(() => expect(fetchRemote).toHaveBeenCalled());
    await act(async () => undefined);

    expect(result.current.catalog).toEqual(seed);
    expect(save).not.toHaveBeenCalled();
  });

  it("no reescribe si la versión del catálogo no cambió", async () => {
    const seed = makeCatalog();
    const save = vi.fn(async () => undefined);

    renderHook(() =>
      useCatalog({
        seed,
        load: async () => ({ catalog: seed, origin: "local" }),
        fetchRemote: async () => makeWireCatalog(),
        save,
      }),
    );

    await waitFor(() => expect(save).not.toHaveBeenCalled());
    await act(async () => undefined);

    expect(save).not.toHaveBeenCalled();
  });

  it("reintenta el refresco cuando vuelve la conexión", async () => {
    const seed = makeCatalog();
    const updated = makeCatalog({ updated_at: "2026-11-12T09:00:00Z" });
    let attempt = 0;
    const fetchRemote = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error("sin red");
      }
      return makeWireCatalog({ updated_at: "2026-11-12T09:00:00Z" });
    });
    const save = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useCatalog({
        seed,
        load: async () => ({ catalog: seed, origin: "local" as const }),
        fetchRemote,
        save,
      }),
    );

    await waitFor(() => expect(result.current.online).toBe(false));

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.catalog).toEqual(updated));
    expect(result.current.online).toBe(true);
    expect(save).toHaveBeenCalledWith(updated);
  });

  it("reacciona a los eventos online y offline", async () => {
    const seed = makeCatalog();

    const { result } = renderHook(() =>
      useCatalog({
        seed,
        load: async () => ({ catalog: seed, origin: "local" }),
        fetchRemote: () => new Promise(() => undefined),
        save: vi.fn(async () => undefined),
      }),
    );

    await waitFor(() => expect(result.current.catalog).toEqual(seed));

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });
});
