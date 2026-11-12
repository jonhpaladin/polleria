import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePwaUpdate } from "@/hooks/usePwaUpdate";
import { PWA_NEED_REFRESH_EVENT, PWA_UPDATE_EVENT } from "@/lib/pwaEvents";

describe("usePwaUpdate", () => {
  it("escucha el aviso, pide actualizar y permite posponer", () => {
    const updateListener = vi.fn();
    window.addEventListener(PWA_UPDATE_EVENT, updateListener);

    const { result } = renderHook(() => usePwaUpdate());
    expect(result.current.needRefresh).toBe(false);

    act(() => {
      window.dispatchEvent(new Event(PWA_NEED_REFRESH_EVENT));
    });
    expect(result.current.needRefresh).toBe(true);

    act(() => {
      result.current.update();
    });
    expect(updateListener).toHaveBeenCalledOnce();

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.needRefresh).toBe(false);

    window.removeEventListener(PWA_UPDATE_EVENT, updateListener);
  });
});
