import { useState, type FormEvent } from "react";

import { PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/payment";
import { assertCents, centsToDecimal, formatCents } from "@/lib/money";
import { APP_TIME_ZONE } from "@/lib/dailyPrices";
import {
  formatProductQuantity,
  formatSignedCents,
  hasNewSales,
  parseCashAmount,
  reconcileReports,
} from "@/lib/reports";
import { VoidTicketDialog } from "@/components/pos/VoidTicketDialog";
import type { CashCut, DailyReport, RemoteDailyReport } from "@/types/report";
import type { LocalTicket } from "@/types/sale";

interface ReportsTabProps {
  businessDate: string | null;
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
  onSaveCash: (opening: string, counted: string) => Promise<boolean>;
  onVoid: (clientOrderUuid: string, reason: string) => Promise<boolean>;
}

function parseInput(value: string) {
  try {
    return parseCashAmount(value);
  } catch {
    return null;
  }
}

function differenceLabel(difference: number): string {
  if (difference === 0) return "Caja cuadrada";
  return difference > 0
    ? `Sobrante ${formatCents(assertCents(difference))}`
    : `Faltante ${formatCents(assertCents(-difference))}`;
}

export function ReportsTab({
  businessDate,
  report,
  tickets,
  cut,
  unsynced,
  history,
  remote,
  remoteLoading,
  loading,
  saving,
  error,
  onSaveCash,
  onVoid,
}: ReportsTabProps) {
  const [voiding, setVoiding] = useState<LocalTicket | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const orderedTickets = [...tickets].sort((left, right) => right.localFolio - left.localFolio);
  const reconciliation =
    report && remote && remote.business_date === report.businessDate
      ? reconcileReports(report, remote)
      : null;

  return (
    <section aria-labelledby="corte-title" className="px-4 pb-24 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="corte-title" className="text-xl font-black text-stone-900">
            Corte del día
          </h2>
          <p className="text-sm text-stone-600">{businessDate ?? "Sin día de negocio"}</p>
        </div>
        {cut ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
            {cut.recalculatedAtUtc ? "Recalculado" : "Cerrado"}
          </span>
        ) : null}
      </div>

      {loading && !report ? (
        <p className="py-10 text-center text-stone-600">Cargando corte…</p>
      ) : null}

      {!businessDate ? (
        <p className="py-10 text-center text-stone-600">
          Abre Precios del día para cargar la fecha de negocio.
        </p>
      ) : null}

      {report ? (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Summary label="Total vendido" value={formatCents(report.totalCents)} />
            <Summary label="Tickets" value={String(report.ticketCount)} />
            <Summary label="Promedio" value={formatCents(report.averageTicketCents)} />
          </div>

          <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-stone-900">
              Ventas del día ({tickets.length})
            </summary>
            <p className="text-xs text-stone-500">Las anuladas no suman en el corte.</p>
            {orderedTickets.length === 0 ? (
              <p className="py-2 text-sm text-stone-600">Sin ventas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100">
                {orderedTickets.map((ticket) => (
                  <li
                    key={ticket.clientOrderUuid}
                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900">
                        Folio #{ticket.localFolio} ·{" "}
                        <span className="tabular-nums">{formatCents(ticket.totalCents)}</span>
                      </p>
                      <p className="text-xs text-stone-500">
                        {new Intl.DateTimeFormat("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: APP_TIME_ZONE,
                        }).format(new Date(ticket.soldAtUtc))}{" "}
                        · {PAYMENT_LABEL[ticket.paymentMethod]}
                      </p>
                      {ticket.status === "voided" ? (
                        <p className="text-xs font-semibold text-red-700">
                          Anulada · {ticket.voidReason}
                          {ticket.voidPending ? " · pendiente de sincronizar" : ""}
                          {ticket.voidLastError ? ` · ${ticket.voidLastError}` : ""}
                        </p>
                      ) : null}
                    </div>
                    {ticket.status === "voided" ? (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
                        Anulada
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setVoiding(ticket);
                        }}
                        className="min-h-12 rounded-full border border-red-300 px-4 text-sm font-bold text-red-800"
                      >
                        Anular
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {notice ? (
              <p role="status" className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                {notice}
              </p>
            ) : null}
          </details>

          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-bold text-stone-900">Por método de pago</h3>
            <ul className="mt-2 divide-y divide-stone-100">
              {PAYMENT_METHODS.map((method) => (
                <li key={method} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-stone-700">{PAYMENT_LABEL[method]}</span>
                  <span className="font-semibold tabular-nums text-stone-900">
                    {formatCents(report.byPayment[method])}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <CashForm
            key={cut?.recalculatedAtUtc ?? cut?.closedAtUtc ?? "nuevo"}
            report={report}
            cut={cut}
            saving={saving}
            error={error}
            onSaveCash={onSaveCash}
          />

          {unsynced > 0 ? (
            <p role="status" className="mt-3 text-sm font-semibold text-amber-900">
              {unsynced} {unsynced === 1 ? "venta" : "ventas"} sin sincronizar.
            </p>
          ) : null}

          <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-stone-900">
              Productos ({report.byProduct.length})
            </summary>
            {report.byProduct.length === 0 ? (
              <p className="text-sm text-stone-600">Sin ventas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100">
                {report.byProduct.map((product) => (
                  <li
                    key={product.productId}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-900">
                        {product.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {formatProductQuantity(product)}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                      {formatCents(product.totalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-stone-900">
              Categorías ({report.byCategory.length})
            </summary>
            {report.byCategory.length === 0 ? (
              <p className="text-sm text-stone-600">Sin ventas.</p>
            ) : (
              <ul className="mt-2 divide-y divide-stone-100">
                {report.byCategory.map((category) => (
                  <li
                    key={category.name}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="text-stone-700">{category.name}</span>
                    <span className="font-semibold tabular-nums text-stone-900">
                      {formatCents(category.totalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-bold text-stone-900">Conciliación con el backend</h3>
            {remoteLoading ? (
              <p className="mt-2 text-sm text-stone-600">Consultando…</p>
            ) : reconciliation === null ? (
              <p className="mt-2 text-sm text-stone-600">
                Sin conciliación: la API no respondió. El corte local sigue siendo válido.
              </p>
            ) : (
              <>
                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-600">Local</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatCents(reconciliation.localTotalCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-600">Backend</dt>
                    <dd className="font-semibold tabular-nums">
                      {reconciliation.remoteTotalCents === null
                        ? "—"
                        : formatCents(reconciliation.remoteTotalCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-600">Diferencia</dt>
                    <dd
                      data-testid="reconciliation-difference"
                      className="font-black tabular-nums"
                    >
                      {reconciliation.differenceCents === null
                        ? "—"
                        : formatSignedCents(reconciliation.differenceCents)}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-3 space-y-1 border-t border-stone-100 pt-2 text-xs">
                  {PAYMENT_METHODS.map((method) => {
                    const row = reconciliation.byPayment[method];
                    return (
                      <li key={method} className="flex justify-between gap-2">
                        <span className="text-stone-600">{PAYMENT_LABEL[method]}</span>
                        <span className="tabular-nums text-stone-700">
                          {formatCents(row.localCents)} /{" "}
                          {row.remoteCents === null ? "—" : formatCents(row.remoteCents)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-stone-500">
                  El backend solo incluye ventas sincronizadas.
                </p>
              </>
            )}
          </section>

          {history.length > 0 ? (
            <section className="mt-4">
              <h3 className="text-sm font-bold text-stone-900">Cortes anteriores</h3>
              <ul className="mt-2 space-y-2">
                {history.map((item) => (
                  <li
                    key={item.businessDate}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-stone-900">{item.businessDate}</span>
                    <span className="tabular-nums text-stone-700">
                      {formatCents(item.totalCents)}
                    </span>
                    <span
                      className={`tabular-nums font-semibold ${
                        item.differenceCents === 0
                          ? "text-stone-600"
                          : item.differenceCents > 0
                            ? "text-emerald-700"
                            : "text-red-700"
                      }`}
                    >
                      {formatSignedCents(item.differenceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      {voiding ? (
        <VoidTicketDialog
          ticket={voiding}
          onClose={() => setVoiding(null)}
          onConfirm={async (reason) => {
            const ok = await onVoid(voiding.clientOrderUuid, reason);
            if (ok) {
              setNotice(`Venta #${voiding.localFolio} anulada.`);
              setVoiding(null);
            }
            return ok;
          }}
        />
      ) : null}
    </section>
  );
}

interface CashFormProps {
  report: DailyReport;
  cut: CashCut | null;
  saving: boolean;
  error: string | null;
  onSaveCash: (opening: string, counted: string) => Promise<boolean>;
}

function CashForm({ report, cut, saving, error, onSaveCash }: CashFormProps) {
  const [opening, setOpening] = useState(() =>
    cut ? centsToDecimal(cut.openingCashCents) : "0.00",
  );
  const [counted, setCounted] = useState(() =>
    cut ? centsToDecimal(cut.countedCashCents) : "",
  );
  const [formError, setFormError] = useState<string | null>(null);

  const openingCents = parseInput(opening);
  const countedCents = parseInput(counted);
  const expectedCashCents =
    openingCents !== null ? openingCents + report.byPayment.cash : null;
  const differenceCents =
    countedCents !== null && expectedCashCents !== null
      ? countedCents - expectedCashCents
      : null;
  const canSave =
    openingCents !== null &&
    countedCents !== null &&
    counted.trim() !== "" &&
    !saving;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) {
      setFormError("Captura el efectivo contado con dos decimales.");
      return;
    }
    setFormError(null);
    const saved = await onSaveCash(opening, counted);
    if (!saved) setFormError("No se pudo guardar el corte.");
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
      <h3 className="text-sm font-bold text-stone-900">Efectivo de caja</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-stone-700">
          Fondo inicial
          <input
            value={opening}
            onChange={(event) => {
              setOpening(event.target.value);
              setFormError(null);
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base font-bold tabular-nums text-stone-900 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          />
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Efectivo contado
          <input
            value={counted}
            onChange={(event) => {
              setCounted(event.target.value);
              setFormError(null);
            }}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base font-bold tabular-nums text-stone-900 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          />
        </label>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <dt className="text-xs font-semibold text-stone-500">Efectivo esperado</dt>
          <dd className="text-lg font-black tabular-nums text-stone-900">
            {expectedCashCents === null ? "—" : formatCents(assertCents(expectedCashCents))}
          </dd>
        </div>
        <div className="rounded-xl bg-stone-50 px-3 py-2">
          <dt className="text-xs font-semibold text-stone-500">Diferencia</dt>
          <dd
            className={`text-lg font-black tabular-nums ${
              differenceCents === null || differenceCents === 0
                ? "text-stone-900"
                : differenceCents > 0
                  ? "text-emerald-700"
                  : "text-red-700"
            }`}
          >
            {differenceCents === null ? "—" : differenceLabel(differenceCents)}
          </dd>
        </div>
      </dl>

      {cut && hasNewSales(report, cut) ? (
        <p role="status" className="mt-3 text-sm font-semibold text-amber-900">
          El corte cambió desde el cierre; recalcula para actualizarlo.
        </p>
      ) : null}

      {formError ?? error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700">
          {formError ?? error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSave}
        className="mt-3 min-h-14 w-full rounded-2xl bg-brand-600 text-base font-black text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
      >
        {saving ? "Guardando corte…" : cut ? "Recalcular" : "Cerrar caja"}
      </button>
    </form>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-stone-900">{value}</p>
    </div>
  );
}
