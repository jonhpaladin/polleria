interface SyncBadgeProps {
  pending: number;
  failed: number;
  syncing: boolean;
  onRetry: () => void;
}

/**
 * Estado del outbox junto al indicador de red. Cuando no hay nada que enviar
 * no ocupa espacio. Los fallidos se distinguen por texto, icono y color.
 */
export function SyncBadge({ pending, failed, syncing, onRetry }: SyncBadgeProps) {
  if (!syncing && pending === 0 && failed === 0) return null;

  const hasFailure = failed > 0 && !syncing;
  const label = syncing
    ? "Sincronizando…"
    : hasFailure
      ? `${failed} ${failed === 1 ? "venta" : "ventas"} con error`
      : `${pending} ${pending === 1 ? "venta" : "ventas"} por enviar`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        role="status"
        aria-live="polite"
        className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
          hasFailure
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-2.5 rounded-full ${hasFailure ? "bg-red-500" : "bg-amber-500"}`}
        />
        {label}
      </span>
      {hasFailure ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-12 rounded-full border border-red-300 bg-white px-4 text-sm font-bold text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
