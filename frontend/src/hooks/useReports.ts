import { useCallback, useEffect, useRef, useState } from "react";

import { getDb, type PolleriaDb } from "@/lib/db";
import {
  countUnsyncedTickets,
  listCashCuts,
  listTicketsByBusinessDate,
  readCashCut,
  saveCashCut,
} from "@/lib/reportRepository";
import { buildCashCut, buildDailyReport, parseCashAmount } from "@/lib/reports";
import { fetchDailyReport } from "@/lib/reportsApi";
import { voidTicket } from "@/lib/ticketRepository";
import type { CashCut, DailyReport, RemoteDailyReport } from "@/types/report";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

export interface UseReportsOptions {
  businessDate: string | null;
  active: boolean;
  db?: PolleriaDb;
  fetchReport?: (businessDate: string) => Promise<RemoteDailyReport | null>;
}

export interface UseReportsResult {
  report: DailyReport | null;
  tickets: LocalTicket[];
  cut: CashCut | null;
  unsynced: number;
  history: CashCut[];
  remote: RemoteDailyReport | null;
  remoteLoading: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  saveCash: (opening: string, counted: string) => Promise<boolean>;
  voidSale: (clientOrderUuid: string, reason: string) => Promise<boolean>;
  reload: () => void;
}

/**
 * Corte local del día. Recarga al abrir la pestaña, guarda la foto y consulta
 * la conciliación sin bloquear: si la API falla, el corte sigue disponible.
 */
export function useReports(options: UseReportsOptions): UseReportsResult {
  const { businessDate, active } = options;
  const [deps] = useState(() => ({
    db: options.db ?? getDb(),
    fetchReport:
      options.fetchReport ??
      ((date: string) => fetchDailyReport(date)),
  }));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [cut, setCut] = useState<CashCut | null>(null);
  const [unsynced, setUnsynced] = useState(0);
  const [history, setHistory] = useState<CashCut[]>([]);
  const [remote, setRemote] = useState<RemoteDailyReport | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const remoteRequest = useRef(0);

  const loadRemote = useCallback(
    async (date: string) => {
      const request = ++remoteRequest.current;
      setRemoteLoading(true);
      const result = await deps.fetchReport(date);
      if (request !== remoteRequest.current) return;
      setRemote(result);
      setRemoteLoading(false);
    },
    [deps],
  );

  const load = useCallback(
    async (date: string) => {
      setLoading(true);
      setError(null);
      setRemote(null);
      try {
        const dayTickets = await listTicketsByBusinessDate(deps.db, date);
        const nextReport = buildDailyReport(dayTickets, date);
        const [nextCut, nextUnsynced, nextHistory] = await Promise.all([
          readCashCut(deps.db, date),
          countUnsyncedTickets(deps.db, date),
          listCashCuts(deps.db),
        ]);
        setTickets(dayTickets);
        setReport(nextReport);
        setCut(nextCut ?? null);
        setUnsynced(nextUnsynced);
        setHistory(nextHistory);
        void loadRemote(date);
      } catch (cause) {
        console.warn("REPORT_LOAD_FAILED", cause);
        setError("No se pudo leer el corte. Vuelve a intentar.");
      } finally {
        setLoading(false);
      }
    },
    [deps, loadRemote],
  );

  useEffect(() => {
    if (!active || !businessDate) return;
    // Un tick evita encadenar renderizados dentro del efecto de apertura.
    const timer = setTimeout(() => {
      void load(businessDate);
    }, 0);
    return () => clearTimeout(timer);
  }, [active, businessDate, load, reloadToken]);

  const saveCash = useCallback(
    async (opening: string, counted: string): Promise<boolean> => {
      if (!report || report.businessDate !== businessDate || !businessDate || saving) {
        return false;
      }
      let openingCents: Cents;
      let countedCents: Cents;
      try {
        openingCents = parseCashAmount(opening);
        countedCents = parseCashAmount(counted);
      } catch {
        setError("Captura fondo y efectivo contado con dos decimales.");
        return false;
      }
      setSaving(true);
      setError(null);
      try {
        const nextCut = buildCashCut(
          report,
          openingCents,
          countedCents,
          new Date(),
          cut && cut.businessDate === businessDate ? cut : undefined,
        );
        await saveCashCut(deps.db, nextCut);
        setCut(nextCut);
        setHistory(await listCashCuts(deps.db));
        return true;
      } catch (cause) {
        console.warn("CASH_CUT_SAVE_FAILED", cause);
        setError("No se pudo guardar el corte. Vuelve a intentar.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [report, businessDate, saving, cut, deps.db],
  );

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const voidSale = useCallback(
    async (clientOrderUuid: string, reason: string): Promise<boolean> => {
      if (!businessDate) return false;
      try {
        await voidTicket(deps.db, clientOrderUuid, reason);
        await load(businessDate);
        return true;
      } catch (cause) {
        console.warn("VOID_TICKET_FAILED", cause);
        setError("No se pudo anular la venta. Vuelve a intentar.");
        return false;
      }
    },
    [businessDate, deps.db, load],
  );

  const currentReport =
    report && report.businessDate === businessDate ? report : null;
  const currentCut = cut && cut.businessDate === businessDate ? cut : null;
  const isLoading =
    loading || (active && businessDate !== null && currentReport === null);

  return {
    report: currentReport,
    tickets,
    cut: currentCut,
    unsynced,
    history,
    remote,
    remoteLoading,
    loading: isLoading,
    saving,
    error,
    saveCash,
    voidSale,
    reload,
  };
}
