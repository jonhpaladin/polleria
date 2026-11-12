interface UpdateBannerProps {
  visible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

/** Aviso no bloqueante de una versión nueva; el cajero decide cuándo recargar. */
export function UpdateBanner({ visible, onUpdate, onDismiss }: UpdateBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-300 bg-amber-100 px-4 py-3 text-amber-950"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          Hay una versión nueva del catálogo disponible.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onUpdate}
            className="min-h-12 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white transition-colors active:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-100"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-12 rounded-full border border-amber-400 bg-white px-5 text-sm font-semibold text-amber-950 transition-colors active:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-100"
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
