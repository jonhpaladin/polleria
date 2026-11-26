import { useState } from "react";

import type { LocalTicket } from "@/types/sale";

interface PrintTicketButtonProps {
  ticket: LocalTicket;
  label: string;
  reason: "sale" | "reprint";
  onPrint: (ticket: LocalTicket, reason: "sale" | "reprint") => Promise<void>;
  onSystemPrint?: (ticket: LocalTicket) => Promise<void>;
  className?: string;
}

/** Botón de impresión/Reimpresión; la cola decide si sale ahora o al conectar. */
export function PrintTicketButton({
  ticket,
  label,
  reason,
  onPrint,
  onSystemPrint,
  className = "",
}: PrintTicketButtonProps) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handlePrint() {
    setBusy(true);
    setFeedback(null);
    try {
      await onPrint(ticket, reason);
      setFeedback(
        reason === "reprint"
          ? "Reimpresión en cola."
          : "Ticket en cola de impresión; se enviará al conectar.",
      );
    } catch {
      setFeedback("No se pudo encolar el ticket. Vuelve a intentar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSystemPrint() {
    if (!onSystemPrint) return;
    setBusy(true);
    setFeedback(null);
    try {
      await onSystemPrint(ticket);
      setFeedback("Vista de impresión del sistema abierta.");
    } catch {
      setFeedback("No se pudo abrir la impresión del sistema.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handlePrint()}
          disabled={busy}
          className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 disabled:opacity-60"
        >
          {busy ? "Enviando…" : label}
        </button>
        {onSystemPrint ? (
          <button
            type="button"
            onClick={() => void handleSystemPrint()}
            disabled={busy}
            className="min-h-12 rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 disabled:opacity-60"
          >
            Imprimir con el sistema
          </button>
        ) : null}
      </div>
      {feedback ? (
        <p role="status" aria-live="polite" className="mt-1 text-xs text-stone-600">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
