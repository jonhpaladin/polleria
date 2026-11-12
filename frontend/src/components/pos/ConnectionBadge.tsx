interface ConnectionBadgeProps {
  online: boolean;
}

/** Estado de red accesible: el texto y el color cambian juntos, nunca solo el color. */
export function ConnectionBadge({ online }: ConnectionBadgeProps) {
  return (
    <span
      aria-live="polite"
      className="inline-flex min-h-12 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-800"
    >
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {online ? "En línea" : "Sin conexión"}
    </span>
  );
}
