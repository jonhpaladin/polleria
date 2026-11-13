import {
  adjustGrams,
  assertGrams,
  formatGrams,
  GRAM_STEP,
  MAX_GRAMS,
  MIN_GRAMS,
  WEIGHT_SHORTCUTS,
} from "@/lib/weight";
import type { Grams } from "@/types/sale";

interface WeightControlsProps {
  grams: Grams;
  onChange: (grams: Grams) => void;
}

/** Atajos de peso enteros, sin kilos flotantes en el estado. */
export function WeightControls({ grams, onChange }: WeightControlsProps) {
  const changeBy = (delta: -1 | 1) => {
    const next = grams + delta * GRAM_STEP;
    if (next >= MIN_GRAMS && next <= MAX_GRAMS) onChange(adjustGrams(grams, delta));
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-bold tabular-nums text-stone-900">{formatGrams(grams)}</p>
      <div className="flex flex-wrap gap-2">
        {WEIGHT_SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut}
            type="button"
            aria-pressed={grams === shortcut}
            onClick={() => onChange(assertGrams(shortcut))}
            className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${grams === shortcut ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
          >
            {formatGrams(assertGrams(shortcut))}
          </button>
        ))}
        <button
          type="button"
          aria-label="Disminuir 250 gramos"
          disabled={grams <= MIN_GRAMS}
          onClick={() => changeBy(-1)}
          className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold text-stone-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Aumentar 250 gramos"
          disabled={grams >= MAX_GRAMS}
          onClick={() => changeBy(1)}
          className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold text-stone-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          +
        </button>
      </div>
    </div>
  );
}
