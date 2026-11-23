import { useState } from "react";

import { useBackup } from "@/hooks/useBackup";
import { validateBackup } from "@/lib/backup";
import { isBackupOverdue } from "@/lib/backupStatus";
import { APP_TIME_ZONE } from "@/lib/dailyPrices";
import type { PolleriaDb } from "@/lib/db";
import type { BackupPayload, RestoreResult } from "@/types/backup";

interface BackupTabProps {
  db?: PolleriaDb;
}

function formatMoment(iso: string | null): string {
  if (!iso) return "Sin respaldo todavía";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(iso));
}

function restoreSummary(result: RestoreResult): string {
  return [
    `Tickets +${result.tickets.added} (${result.tickets.skipped} ya existían)`,
    `Pendientes +${result.outbox.added} (${result.outbox.skipped} ya existían)`,
    `Cortes +${result.cashCuts.added} (${result.cashCuts.skipped} ya existían)`,
    `Precios +${result.dailyPrices.added} (${result.dailyPrices.skipped} ya existían)`,
  ].join(" · ");
}

/** Respaldo y restauración de los datos que solo viven en este dispositivo. */
export function BackupTab({ db }: BackupTabProps) {
  const backup = useBackup(db);
  const [pending, setPending] = useState<BackupPayload | null>(null);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const hasData = backup.counts.tickets > 0 || backup.counts.cashCuts > 0;
  const overdue = hasData && isBackupOverdue(backup.lastBackupAt);

  async function handleDownload() {
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      await backup.download();
      setMessage("Respaldo descargado. Guárdalo fuera de la tablet.");
    } catch (cause: unknown) {
      console.warn("BACKUP_DOWNLOAD_FAILED", cause);
      setError("No se pudo generar el respaldo. Intenta de nuevo.");
    } finally {
      setWorking(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPending(null);
    setResult(null);
    setMessage(null);
    setError(null);
    try {
      const raw: unknown = JSON.parse(await file.text());
      const checked = validateBackup(raw);
      if (!checked.ok) {
        setError(checked.error);
        return;
      }
      setPending(checked.backup);
    } catch {
      setError("No se pudo leer el archivo. Elige un respaldo JSON válido.");
    }
  }

  async function confirmRestore() {
    if (!pending) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    try {
      const restored = await backup.restore(pending);
      setResult(restored);
      setPending(null);
      setMessage("Respaldo restaurado. No se borró ningún dato existente.");
    } catch (cause: unknown) {
      console.warn("BACKUP_RESTORE_FAILED", cause);
      setError("No se pudo restaurar. Los datos actuales quedaron intactos.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="space-y-4 px-4 py-6" aria-labelledby="backup-title">
      <div>
        <h2 id="backup-title" className="text-xl font-black text-brand-700">
          Respaldo de datos
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          Los cortes y las ventas pendientes solo viven en esta tablet. Descarga un respaldo y
          guárdalo en un lugar privado.
        </p>
      </div>

      {overdue ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {backup.lastBackupAt
            ? "Pasaron más de 7 días desde el último respaldo."
            : "Todavía no has descargado un respaldo de este dispositivo."}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountCard label="Tickets" value={backup.counts.tickets} />
        <CountCard label="Pendientes" value={backup.counts.outbox} />
        <CountCard label="Cortes" value={backup.counts.cashCuts} />
        <CountCard label="Hojas de precios" value={backup.counts.dailyPrices} />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">
          Último respaldo: <span className="font-semibold">{formatMoment(backup.lastBackupAt)}</span>
        </p>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={working || backup.loading}
          className="mt-3 min-h-12 w-full rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60 sm:w-auto"
        >
          {working ? "Generando…" : "Descargar respaldo"}
        </button>
        <p className="mt-2 text-xs text-stone-500">
          El archivo contiene ventas y cortes; no incluye el catálogo ni las claves del local.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-bold text-stone-900">Restaurar un respaldo</h3>
        <p className="mt-1 text-sm text-stone-600">
          Se agregan los datos que falten. Lo que ya existe en esta tablet no se borra ni se
          reemplaza.
        </p>
        <label
          htmlFor="backup-file"
          className="mt-3 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
        >
          Elegir archivo…
        </label>
        <input
          id="backup-file"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />

        {pending ? (
          <div className="mt-3 space-y-2 rounded-lg bg-cream-50 p-3">
            <p className="text-sm font-semibold">
              Respaldo del {formatMoment(pending.exportedAt)}
            </p>
            <p className="text-sm text-stone-600">
              {pending.counts.tickets} tickets · {pending.counts.outbox} pendientes ·{" "}
              {pending.counts.cashCuts} cortes · {pending.counts.dailyPrices} hojas de precios
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void confirmRestore()}
                disabled={working}
                className="min-h-12 flex-1 rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60"
              >
                {working ? "Restaurando…" : "Confirmar restauración"}
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-12 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="space-y-2">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
            {message}
          </p>
        ) : null}
        {result ? <p className="text-sm text-stone-600">{restoreSummary(result)}</p> : null}
      </div>
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="text-2xl font-black tabular-nums text-brand-700">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
    </div>
  );
}
