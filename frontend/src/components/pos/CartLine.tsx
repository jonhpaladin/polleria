import { useState } from "react";

import { centsToDecimal, formatCents } from "@/lib/money";
import { validateManualPrice } from "@/lib/dailyPrices";
import type { CartAction } from "@/lib/cart";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CartLine as CartLineType } from "@/types/sale";
import { WeightControls } from "@/components/pos/WeightControls";

interface CartLineProps {
  line: CartLineType;
  dailyPrice?: DailyPrice;
  onAction: (action: CartAction) => void;
}

const SOURCE_LABEL = { lista: "Normal", promocion: "Promoción", mayoreo: "Mayoreo", manual: "Manual" } as const;

export function CartLine({ line, dailyPrice, onAction }: CartLineProps) {
  const prices = dailyPrice
    ? [
        ["lista", dailyPrice.normalPriceCents],
        ["promocion", dailyPrice.promotionPriceCents],
        ["mayoreo", dailyPrice.wholesalePriceCents],
      ] as const
    : [];
  const [manualOpen, setManualOpen] = useState(line.priceSource === "manual");
  const [manualDraft, setManualDraft] = useState(
    line.priceSource === "manual" ? centsToDecimal(line.unitPriceCents) : "",
  );
  const [manualError, setManualError] = useState<string | null>(null);

  function applyManualPrice() {
    try {
      const cents = validateManualPrice(manualDraft);
      setManualError(null);
      onAction({ type: "setManualPrice", lineId: line.lineId, unitPriceCents: cents });
    } catch (cause: unknown) {
      setManualError(cause instanceof Error ? cause.message : "Precio manual inválido");
    }
  }

  return (
    <li className="border-b border-stone-200 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-stone-900">{line.name}</p>
          <p className="text-xs text-stone-500">
            {line.unit === "kg" ? "Por kilo" : `${line.quantity} pieza${line.quantity === 1 ? "" : "s"}`} · {SOURCE_LABEL[line.priceSource]}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold tabular-nums text-stone-900">{formatCents(line.lineTotalCents)}</p>
          <button
            type="button"
            onClick={() => onAction({ type: "removeLine", lineId: line.lineId })}
            className="mt-1 min-h-12 min-w-12 rounded-lg px-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          >
            Quitar
          </button>
        </div>
      </div>

      {line.unit === "piece" ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label={`Disminuir cantidad de ${line.name}`}
            onClick={() => onAction({ type: "decrementPiece", lineId: line.lineId })}
            className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            −
          </button>
          <span className="min-w-10 text-center text-lg font-bold tabular-nums">{line.quantity}</span>
          <button
            type="button"
            aria-label={`Aumentar cantidad de ${line.name}`}
            onClick={() => onAction({ type: "incrementPiece", lineId: line.lineId })}
            className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            +
          </button>
        </div>
      ) : line.grams !== null ? (
        <WeightControls
          grams={line.grams}
          onChange={(grams) => onAction({ type: "setWeight", lineId: line.lineId, grams })}
        />
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {prices.map(([source, cents]) =>
          cents === null ? null : (
            <button
              key={source}
              type="button"
              aria-pressed={line.priceSource === source}
              onClick={() => onAction({ type: "selectPrice", lineId: line.lineId, source, dailyPrice: dailyPrice! })}
              className={`min-h-12 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${line.priceSource === source ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
            >
              {SOURCE_LABEL[source]} {formatCents(cents)}
            </button>
          ),
        )}
        <button
          type="button"
          aria-expanded={manualOpen}
          aria-pressed={line.priceSource === "manual"}
          onClick={() => {
            setManualOpen(true);
            setManualError(null);
          }}
          className={`min-h-12 rounded-xl border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${line.priceSource === "manual" ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
        >
          Precio manual
        </button>
      </div>

      {manualOpen ? (
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            applyManualPrice();
          }}
        >
          <label className="min-w-40 flex-1 text-xs font-semibold text-stone-600">
            Precio manual de {line.name}
            <input
              value={manualDraft}
              onChange={(event) => {
                setManualDraft(event.target.value);
                setManualError(null);
              }}
              inputMode="decimal"
              autoComplete="off"
              placeholder="150.00"
              className="mt-1 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base font-bold tabular-nums text-stone-900 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            />
          </label>
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            Aplicar
          </button>
        </form>
      ) : null}

      {manualError ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {manualError}
        </p>
      ) : null}
    </li>
  );
}
