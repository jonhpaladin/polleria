import { useCallback, useEffect, useRef, useState } from "react";

import { buildBaseDailyPrices, businessDate } from "@/lib/dailyPrices";
import { openDailyPrices, saveDailyPriceDrafts } from "@/lib/dailyPriceRepository";
import type { Catalog } from "@/types/catalog";
import type { DailyPrice, DailyPriceDraft } from "@/types/dailyPrice";

export interface UseDailyPricesResult {
  rows: DailyPrice[];
  businessDate: string | null;
  isToday: boolean;
  loading: boolean;
  saving: boolean;
  canSave: boolean;
  error: string | null;
  save: (drafts: readonly DailyPriceDraft[]) => Promise<boolean>;
}

/** Abre automáticamente la hoja local del día y no pisa una hoja existente. */
export function useDailyPrices(catalog: Catalog | null): UseDailyPricesResult {
  const [rows, setRows] = useState<DailyPrice[]>([]);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const catalogRef = useRef(catalog);
  const dateRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  const load = useCallback(async () => {
    const activeCatalog = catalogRef.current;
    if (!activeCatalog) return;
    const request = requestRef.current + 1;
    requestRef.current = request;
    const now = new Date();
    setLoading(true);
    try {
      const result = await openDailyPrices(activeCatalog, now);
      if (request !== requestRef.current) return;
      setRows(result.rows);
      setCurrentDate(result.businessDate);
      dateRef.current = result.businessDate;
      setCanSave(true);
      setError(null);
    } catch (cause: unknown) {
      if (request !== requestRef.current) return;
      const date = businessDate(now);
      setRows(buildBaseDailyPrices(activeCatalog, date, now.toISOString()));
      setCurrentDate(date);
      dateRef.current = date;
      setCanSave(false);
      setError("No se pudo guardar la hoja local; se muestra una copia temporal.");
      console.warn("DAILY_PRICES_DB_UNAVAILABLE", cause);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [catalog, load]);

  // La hoja se rota al cambiar el día de negocio aunque la pestaña siga abierta.
  useEffect(() => {
    const check = () => {
      const today = businessDate(new Date());
      if (dateRef.current !== null && dateRef.current !== today) void load();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = window.setInterval(check, 60_000);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [load]);

  const save = useCallback(
    async (drafts: readonly DailyPriceDraft[]) => {
      if (!catalog || !currentDate || !canSave) return false;
      setSaving(true);
      setError(null);
      try {
        const saved = await saveDailyPriceDrafts(catalog, currentDate, drafts);
        setRows(saved);
        return true;
      } catch (cause: unknown) {
        setError("No se pudieron guardar los precios. Conserva los datos y vuelve a intentar.");
        console.warn("DAILY_PRICES_SAVE_FAILED", cause);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canSave, catalog, currentDate],
  );

  return {
    rows,
    businessDate: currentDate,
    isToday: currentDate !== null && currentDate === businessDate(new Date()),
    loading,
    saving,
    canSave,
    error,
    save,
  };
}
