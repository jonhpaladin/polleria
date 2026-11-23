interface CartFloatingButtonProps {
  count: number;
  onOpen: () => void;
}

/** Acceso permanente al carrito sin tapar la rejilla de productos. */
export function CartFloatingButton({ count, onOpen }: CartFloatingButtonProps) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir carrito, ${count} ${count === 1 ? "línea" : "líneas"}`}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex min-h-14 min-w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-7">
        <path
          d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="19" r="1.5" fill="currentColor" />
        <circle cx="17" cy="19" r="1.5" fill="currentColor" />
      </svg>
      <span
        aria-live="polite"
        className="absolute -right-1 -top-1 min-w-6 rounded-full bg-stone-900 px-1.5 text-center text-xs font-black leading-6 text-white"
      >
        {count}
      </span>
    </button>
  );
}
