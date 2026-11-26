import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { buildDiagnosticTicket } from "@/printer/encoder";
import type { UsePrinterResult } from "@/hooks/usePrinter";
import type { PrinterCodepage, PrintJob } from "@/types/print";

const CODEPAGES: { value: PrinterCodepage; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "cp858", label: "CP858 (México)" },
  { value: "cp850", label: "CP850" },
  { value: "cp437", label: "CP437" },
];

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Sin impresora",
  connecting: "Conectando…",
  connected: "Impresora lista",
  printing: "Imprimiendo…",
  error: "Error de impresora",
};

function jobStatusLabel(job: PrintJob): string {
  if (job.status === "uncertain") return "No sabemos si salió";
  if (job.status === "failed") return "Falló";
  return job.status;
}

export function PrinterDialog({
  printer,
  onClose,
}: {
  printer: UsePrinterResult;
  onClose: () => void;
}) {
  const { state } = printer;
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const listAttentionJobs = printer.listAttentionJobs;

  useEffect(() => {
    let active = true;
    void listAttentionJobs().then((rows) => {
      if (active) setJobs(rows);
    });
    return () => {
      active = false;
    };
  }, [listAttentionJobs, state.failed, state.uncertain]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  async function reloadJobs() {
    setJobs(await printer.listAttentionJobs());
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/50 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="printer-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="printer-title" className="text-xl font-black text-stone-900">
              Impresora
            </h2>
            <p className="mt-1 text-sm text-stone-600">{STATUS_LABEL[state.status]}</p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-stone-300 text-stone-700"
            aria-label="Cerrar impresora"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          <p className="font-semibold text-stone-900">
            {state.deviceName ?? "Ninguna impresora conectada"}
          </p>
          {state.message ? (
            <p role="status" aria-live="polite" className="mt-1">
              {state.message}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-stone-500">
            Pendientes: {state.pending} · Con error: {state.failed + state.uncertain}
          </p>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {state.supportedBle ? (
            <button
              type="button"
              onClick={() => void printer.connect("ble")}
              disabled={state.status === "connecting"}
              className="min-h-12 rounded-xl bg-brand-600 px-4 font-bold text-white disabled:opacity-60"
            >
              Conectar Bluetooth
            </button>
          ) : null}
          {state.supportedUsb ? (
            <button
              type="button"
              onClick={() => void printer.connect("usb")}
              disabled={state.status === "connecting"}
              className="min-h-12 rounded-xl bg-stone-900 px-4 font-bold text-white disabled:opacity-60"
            >
              Conectar USB
            </button>
          ) : null}
          {!state.supportedBle && !state.supportedUsb ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
              Este navegador no soporta impresión directa. Usa “Imprimir con el sistema” o abre la
              app en Chrome Android.
            </p>
          ) : null}
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void printer.reconnect()}
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800"
          >
            Reconectar
          </button>
          <button
            type="button"
            onClick={() => void printer.disconnect()}
            disabled={state.status !== "connected" && state.status !== "printing"}
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800 disabled:opacity-40"
          >
            Desconectar
          </button>
          <button
            type="button"
            onClick={() => void printer.printTest()}
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800"
          >
            Imprimir prueba
          </button>
          <button
            type="button"
            onClick={() => void printer.printWithSystem(buildDiagnosticTicket())}
            className="min-h-12 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800"
          >
            Imprimir con el sistema
          </button>
        </div>

        <label className="mt-3 block text-sm font-semibold text-stone-700">
          Juego de caracteres
          <select
            value={state.codepage}
            onChange={(event) => printer.setCodepage(event.target.value as PrinterCodepage)}
            className="mt-1 h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base"
          >
            {CODEPAGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-stone-900">Tickets con atención</h3>
            <button
              type="button"
              onClick={() => void reloadJobs()}
              className="min-h-10 rounded-full border border-stone-300 px-3 text-xs font-bold text-stone-700"
            >
              Actualizar
            </button>
          </div>
          {jobs.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">No hay tickets fallidos ni inciertos.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {jobs.map((job) => (
                <li key={job.id} className="rounded-xl border border-stone-200 p-3">
                  <p className="text-sm font-semibold text-stone-900">
                    Folio #{job.ticket.localFolio} · {jobStatusLabel(job)}
                  </p>
                  {job.lastError ? (
                    <p className="mt-1 text-xs text-red-700">{job.lastError}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!job.id) return;
                          void printer.retryFailed(job.id).then(reloadJobs);
                        }}
                        className="min-h-10 rounded-full bg-brand-600 px-3 text-xs font-bold text-white"
                      >
                        Reintentar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!job.id) return;
                          if (
                            window.confirm(
                              "¿Confirmas que el ticket no salió? Se enviará otra vez.",
                            )
                          ) {
                            void printer.retryUncertain(job.id).then(reloadJobs);
                          }
                        }}
                        className="min-h-10 rounded-full bg-amber-700 px-3 text-xs font-bold text-white"
                      >
                        Reimprimir de todos modos
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!job.id) return;
                        void printer.discard(job.id).then(reloadJobs);
                      }}
                      className="min-h-10 rounded-full border border-stone-300 px-3 text-xs font-bold text-stone-700"
                    >
                      Descartar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <a
          href="/printer-test"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-12 items-center text-sm font-bold text-brand-700 underline"
        >
          Abrir diagnóstico de impresora
        </a>
      </section>
    </div>,
    document.body,
  );
}

export function PrinterBadge({ printer }: { printer: UsePrinterResult }) {
  const [open, setOpen] = useState(false);
  const { state } = printer;
  const pending = state.pending + state.failed + state.uncertain;
  const label = STATUS_LABEL[state.status] ?? "Sin impresora";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Impresora: ${label}${pending ? `, ${pending} pendientes` : ""}`}
        className="relative inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current">
          <path
            d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M7 14h10v6H7z" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        <span className="hidden sm:inline">{label}</span>
        {pending > 0 ? (
          <span className="grid min-w-6 place-items-center rounded-full bg-amber-500 px-1.5 text-xs font-black text-white">
            {pending}
          </span>
        ) : null}
      </button>
      {open ? <PrinterDialog printer={printer} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
