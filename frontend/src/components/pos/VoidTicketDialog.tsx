import { useState, type FormEvent } from "react";

import { formatCents } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";
import {
  hasVoidPin,
  isVoidPinFormat,
  registerVoidPinFailure,
  resetVoidPinFailures,
  verifyVoidPin,
  voidPinLocked,
} from "@/lib/voidPin";
import type { LocalTicket } from "@/types/sale";

const REASONS = [
  "Cobro incorrecto",
  "Cliente canceló",
  "Producto equivocado",
  "Otro",
] as const;

interface VoidTicketDialogProps {
  ticket: LocalTicket;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}

/** Confirmación de anulación: motivo, PIN del dueño y advertencia irreversible. */
export function VoidTicketDialog({ ticket, onClose, onConfirm }: VoidTicketDialogProps) {
  const [reason, setReason] = useState<(typeof REASONS)[number]>(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasPin] = useState(() => hasVoidPin());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPin) {
      setError("El dueño debe configurar el PIN en Administración.");
      return;
    }
    const finalReason = [reason === "Otro" ? "" : reason, detail.trim()]
      .filter(Boolean)
      .join(": ");
    if (finalReason.length < 3) {
      setError("Escribe el motivo de la anulación.");
      return;
    }
    if (finalReason.length > 200) {
      setError("El motivo es demasiado largo.");
      return;
    }
    if (!isVoidPinFormat(pin)) {
      setError("El PIN debe tener entre 4 y 6 dígitos.");
      return;
    }
    if (voidPinLocked()) {
      setError("Demasiados intentos. Espera un minuto.");
      return;
    }

    setBusy(true);
    setError(null);
    const pinOk = await verifyVoidPin(pin);
    if (!pinOk) {
      registerVoidPinFailure();
      setError("PIN incorrecto.");
      setBusy(false);
      return;
    }
    resetVoidPinFailures();

    const ok = await onConfirm(finalReason);
    if (!ok) {
      setError("No se pudo anular la venta. Vuelve a intentar.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-title"
    >
      <form
        onSubmit={submit}
        className="max-h-dvh w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-cream-50 p-4 shadow-xl sm:rounded-2xl"
      >
        <div>
          <h2 id="void-title" className="text-lg font-black text-brand-700">
            Anular venta
          </h2>
          <p className="text-sm text-stone-600">
            Folio #{ticket.localFolio} · {formatCents(ticket.totalCents)} ·{" "}
            {PAYMENT_LABEL[ticket.paymentMethod]}
          </p>
        </div>

        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          La venta dejará de contar en el corte. No se puede deshacer; el ticket original se
          conserva para auditoría.
        </p>

        {!hasPin ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            No hay PIN configurado. El dueño debe crearlo en Administración (engrane) antes de
            anular ventas.
          </p>
        ) : null}

        <label className="block text-sm font-semibold text-stone-700">
          Motivo
          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as (typeof REASONS)[number]);
              setError(null);
            }}
            className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
          >
            {REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-stone-700">
          Detalle {reason === "Otro" ? "(obligatorio)" : "(opcional)"}
          <input
            value={detail}
            onChange={(event) => {
              setDetail(event.target.value);
              setError(null);
            }}
            maxLength={150}
            className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base"
            placeholder="Ej. se cobró de más"
          />
        </label>

        <label className="block text-sm font-semibold text-stone-700">
          PIN del dueño
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            maxLength={6}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            className="mt-1 h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base tracking-[0.3em]"
          />
        </label>

        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={busy || !hasPin}
            className="min-h-12 flex-1 rounded-lg bg-brand-600 px-4 font-bold text-white disabled:opacity-60"
          >
            {busy ? "Anulando…" : "Anular venta"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
