import { useState } from "react";

import { useHistory } from "@/hooks/useHistory";
import { businessDate, APP_TIME_ZONE } from "@/lib/dailyPrices";
import { formatCents } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";
import type { PolleriaDb } from "@/lib/db";
import type { CartLine, LocalTicket } from "@/types/sale";

interface HistoryTabProps {
  db?: PolleriaDb;
}

const PRICE_SOURCE_LABEL: Record<CartLine["priceSource"], string> = {
  lista: "Lista",
  promocion: "Promoción",
  mayoreo: "Mayoreo",
  manual: "Manual",
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

function formatGrams(grams: number): string {
  return `${Math.trunc(grams / 1000)}.${String(grams % 1000).padStart(3, "0")} kg`;
}

function lineQuantity(line: CartLine): string {
  return line.unit === "kg" ? formatGrams(line.grams ?? 0) : `${line.quantity} pza`;
}

function daysAgo(days: number): string {
  return businessDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

function TicketDetail({ ticket }: { ticket: LocalTicket }) {
  return (
    <div className="space-y-2 border-t border-stone-100 px-4 py-3">
      {ticket.status === "voided" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Anulada · {ticket.voidReason}
          {ticket.voidedAtUtc ? ` · ${formatDateTime(ticket.voidedAtUtc)}` : ""}
          {ticket.voidPending ? " · pendiente de sincronizar" : ""}
        </p>
      ) : null}
      {ticket.lines.length === 0 ? (
        <p className="text-sm text-stone-600">Este ticket no tiene líneas guardadas.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {ticket.lines.map((line) => (
            <li key={line.lineId} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-900">{line.name}</p>
                <p className="text-xs text-stone-500">
                  {line.categoryName} · {lineQuantity(line)} ·{" "}
                  {PRICE_SOURCE_LABEL[line.priceSource]}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-stone-900">
                  {formatCents(line.lineTotalCents)}
                </p>
                <p className="text-xs tabular-nums text-stone-500">
                  {formatCents(line.unitPriceCents)}/{line.unit === "kg" ? "kg" : "pza"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Historial local por rango, con búsqueda por folio y exportación CSV. */
export function HistoryTab({ db }: HistoryTabProps) {
  const history = useHistory({ db });
  const today = businessDate(new Date());
  const [notice, setNotice] = useState<string | null>(null);

  async function handleExport() {
    setNotice(null);
    const ok = await history.exportCsv();
    if (ok) setNotice("CSV descargado. Incluye las ventas anuladas con su motivo.");
  }

  function setRange(from: string, to: string) {
    history.setFrom(from);
    history.setTo(to);
    setNotice(null);
  }

  return (
    <section aria-labelledby="history-title" className="space-y-4 px-4 pb-24 pt-4">
      <div>
        <h2 id="history-title" className="text-xl font-black text-stone-900">
          Historial de ventas
        </h2>
        <p className="text-sm text-stone-600">
          Consulta los tickets guardados en esta tablet y descarga el detalle para el contador.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-stone-700">
            Desde
            <input
              type="date"
              value={history.from}
              onChange={(event) => history.setFrom(event.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
            />
          </label>
          <label className="text-sm font-semibold text-stone-700">
            Hasta
            <input
              type="date"
              value={history.to}
              onChange={(event) => history.setTo(event.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRange(today, today)}
            className="min-h-12 rounded-full border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setRange(daysAgo(6), today)}
            className="min-h-12 rounded-full border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => history.reload()}
            className="min-h-12 rounded-full border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Actualizar
          </button>
        </div>

        <label className="block text-sm font-semibold text-stone-700">
          Buscar folio
          <input
            type="text"
            inputMode="numeric"
            value={history.search}
            onChange={(event) => history.setSearch(event.target.value)}
            placeholder="Ej. 12"
            className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={history.loading}
          className="min-h-12 w-full rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60 sm:w-auto"
        >
          Exportar CSV ({history.tickets.length})
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Tickets" value={String(history.summary.ticketCount)} />
        <SummaryCard label="Ventas activas" value={formatCents(history.summary.activeTotalCents)} />
        <SummaryCard label="Anuladas" value={String(history.summary.voidedCount)} />
        <SummaryCard label="Total anulado" value={formatCents(history.summary.voidedTotalCents)} />
      </div>

      {history.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {history.error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      ) : null}

      {history.loading ? (
        <p className="py-8 text-center text-stone-600">Leyendo historial…</p>
      ) : history.visible.length === 0 ? (
        <p className="py-8 text-center text-stone-600">
          {history.search
            ? "Ningún ticket coincide con ese folio."
            : "Sin ventas en el rango elegido."}
        </p>
      ) : (
        <ul className="space-y-2">
          {history.visible.map((ticket) => (
            <li key={ticket.clientOrderUuid}>
              <details className="rounded-2xl border border-stone-200 bg-white">
                <summary className="flex min-h-12 cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900">
                      Folio #{ticket.localFolio}
                      {ticket.status === "voided" ? (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                          Anulada
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(ticket.soldAtUtc)} · {PAYMENT_LABEL[ticket.paymentMethod]}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold tabular-nums ${
                      ticket.status === "voided" ? "text-red-700 line-through" : "text-stone-900"
                    }`}
                  >
                    {formatCents(ticket.totalCents)}
                  </p>
                </summary>
                <TicketDetail ticket={ticket} />
              </details>
            </li>
          ))}
        </ul>
      )}

      {history.hasMore ? (
        <p className="text-sm font-semibold text-amber-900">
          Hay más de 500 tickets en el rango; reduce las fechas para ver el resto. El CSV sí
          incluye todos.
        </p>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-black tabular-nums text-stone-900">{value}</p>
    </div>
  );
}
