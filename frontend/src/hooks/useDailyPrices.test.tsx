import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDailyPrices } from "@/hooks/useDailyPrices";
import { makeCatalog } from "@/test/fixtures";

vi.mock("@/lib/dailyPriceRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dailyPriceRepository")>();
  return {
    ...actual,
    openDailyPrices: vi.fn(actual.openDailyPrices),
    saveDailyPriceDrafts: vi.fn(actual.saveDailyPriceDrafts),
  };
});

import { openDailyPrices, saveDailyPriceDrafts } from "@/lib/dailyPriceRepository";

const catalog = makeCatalog();

describe("useDailyPrices", () => {
  it("cae a una hoja temporal y no permite guardar si IndexedDB falla", async () => {
    vi.mocked(openDailyPrices).mockRejectedValueOnce(new Error("IndexedDB bloqueada"));
    const { result } = renderHook(() => useDailyPrices(catalog));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.rows).toHaveLength(catalog.products.length);
    expect(result.current.canSave).toBe(false);
    expect(result.current.error).toContain("temporal");

    let saved = true;
    await act(async () => {
      saved = await result.current.save([
        { productId: "prd-pierna", normal: "150.00", promotion: "", wholesale: "" },
      ]);
    });

    expect(saved).toBe(false);
    expect(vi.mocked(saveDailyPriceDrafts)).not.toHaveBeenCalled();
  });
});
