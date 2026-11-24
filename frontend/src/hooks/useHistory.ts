import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { businessDate } from "@/lib/dailyPrices";
import { getDb, type PolleriaDb } from "@/lib/db";
import {
  filterTicketsByFolio,
  listTicketsBetween,
  summarizeTickets,
} from "@/lib/historyRepository";
import { buildSalesCsv, downloadSalesCsv, salesCsvFileName } from "@/lib/salesCsv";
import type { LocalTicket } from "@/types/sale";

const VISIBLE_LIMIT = 500;

export interface UseHistoryOptions {
  db?: PolleriaDb;
}

export interface UseHistoryResult {
  from: string;
  to: string;
  search: string;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  setSearch: (value: string) => void;
  tickets: LocalTicket[];
  visible: LocalTicket[];
  summary: ReturnType<typeof summarizeTickets>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  exportCsv: () => Promise<boolean>;
  reload: () => void;
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryResult {
  const today = useMemo(() => businessDate(new Date()), []);
  const [deps] = useState(() => ({ db: options.db ?? getDb() }));
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<LocalTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    if (!from || !to) {
      setTickets([]);
      setError("Elige la fecha inicial y la final.");
      setLoading(false);
      return;
    }
    if (from > to) {
      setTickets([]);
      setError("La fecha inicial no puede ser mayor que la final.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await listTicketsBetween(deps.db, from, to);
      if (request !== requestRef.current) return;
      setTickets(result);
    } catch (cause: unknown) {
      if (request !== requestRef.current) return;
      console.warn("HISTORY_LOAD_FAILED", cause);
      setTickets([]);
      setError("No se pudo leer el historial local. Vuelve a intentar.");
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [deps.db, from, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, reloadToken]);

  const filtered = useMemo(() => filterTicketsByFolio(tickets, search), [tickets, search]);
  const visible = useMemo(() => filtered.slice(0, VISIBLE_LIMIT), [filtered]);
  const summary = useMemo(() => summarizeTickets(tickets), [tickets]);

  const exportCsv = useCallback(async () => {
    try {
      const content = buildSalesCsv(tickets);
      downloadSalesCsv(content, salesCsvFileName(from, to));
      return true;
    } catch (cause: unknown) {
      console.warn("HISTORY_CSV_FAILED", cause);
      setError("No se pudo generar el CSV. Vuelve a intentar.");
      return false;
    }
  }, [from, tickets, to]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    from,
    to,
    search,
    setFrom,
    setTo,
    setSearch,
    tickets,
    visible,
    summary,
    loading,
    error,
    hasMore: filtered.length > VISIBLE_LIMIT,
    exportCsv,
    reload,
  };
}
