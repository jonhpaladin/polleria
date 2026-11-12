import type { Category } from "@/types/catalog";

const BASE_BUTTON =
  "min-h-12 shrink-0 rounded-full border px-5 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50";
const SELECTED_BUTTON = "border-brand-600 bg-brand-600 text-white";
const IDLE_BUTTON = "border-stone-300 bg-white text-stone-800 active:bg-stone-100";

interface CategoryBarProps {
  categories: Category[];
  selected: string;
  onSelect: (categoryId: string) => void;
}

/** Barra táctil con "Todos" y las categorías visibles. */
export function CategoryBar({ categories, selected, onSelect }: CategoryBarProps) {
  return (
    <nav
      aria-label="Categorías"
      className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]"
    >
      <button
        type="button"
        aria-pressed={selected === "all"}
        onClick={() => onSelect("all")}
        className={`${BASE_BUTTON} ${selected === "all" ? SELECTED_BUTTON : IDLE_BUTTON}`}
      >
        Todos
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          aria-pressed={selected === category.id}
          onClick={() => onSelect(category.id)}
          className={`${BASE_BUTTON} ${selected === category.id ? SELECTED_BUTTON : IDLE_BUTTON}`}
        >
          {category.name}
        </button>
      ))}
    </nav>
  );
}
