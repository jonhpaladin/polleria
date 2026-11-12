interface EmptyStateProps {
  title: string;
  description?: string;
}

/** Mensaje reutilizable para catálogo vacío o categoría sin productos. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="mx-4 my-10 rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-10 text-center">
      <p className="text-lg font-semibold text-stone-800">{title}</p>
      {description ? <p className="mt-2 text-sm text-stone-600">{description}</p> : null}
    </div>
  );
}
