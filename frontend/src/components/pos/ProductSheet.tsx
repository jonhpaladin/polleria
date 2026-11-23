import { useEffect, useMemo, useRef, useState } from "react";

import { WeightControls } from "@/components/pos/WeightControls";
import { lineTotalCents, type LineSelection } from "@/lib/cart";
import { selectDailyPrice } from "@/lib/dailyPrices";
import { formatCents } from "@/lib/money";
import { assertGrams } from "@/lib/weight";
import type { Cents, Product } from "@/types/catalog";
import type { DailyPrice, DailyPriceSource } from "@/types/dailyPrice";
import type { Grams } from "@/types/sale";

const SOURCE_LABEL: Record<DailyPriceSource, string> = {
  lista: "Normal",
  promocion: "Promoción",
  mayoreo: "Mayoreo",
};

interface ProductSheetProps {
  product: Product;
  categoryName: string;
  dailyPrice?: DailyPrice;
  canSell: boolean;
  onAdd: (selection: LineSelection) => boolean;
  onClose: () => void;
}

/**
 * Hoja de detalle del producto. Se abre como `<dialog>` nativo para heredar foco
 * atrapado, Escape y `aria-modal`; solo «Agregar» toca el carrito.
 */
export function ProductSheet({
  product,
  categoryName,
  dailyPrice,
  canSell,
  onAdd,
  onClose,
}: ProductSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [priceSource, setPriceSource] = useState<DailyPriceSource>("lista");
  const [grams, setGrams] = useState<Grams>(() => assertGrams(1000));
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const availablePrices = useMemo(() => {
    if (!dailyPrice) return [] as { source: DailyPriceSource; cents: Cents }[];
    const entries: { source: DailyPriceSource; cents: Cents | null }[] = [
      { source: "lista", cents: dailyPrice.normalPriceCents },
      { source: "promocion", cents: dailyPrice.promotionPriceCents },
      { source: "mayoreo", cents: dailyPrice.wholesalePriceCents },
    ];
    return entries.filter(
      (entry): entry is { source: DailyPriceSource; cents: Cents } => entry.cents !== null,
    );
  }, [dailyPrice]);

  const selectedPrice = dailyPrice ? selectDailyPrice(dailyPrice, priceSource) : null;
  const unitPriceCents = selectedPrice ?? dailyPrice?.normalPriceCents ?? null;
  const effectiveQuantity = product.unit === "kg" ? 1 : quantity;
  const totalCents =
    unitPriceCents === null
      ? null
      : lineTotalCents(unitPriceCents, {
          unit: product.unit,
          quantity: effectiveQuantity,
          grams: product.unit === "kg" ? grams : null,
        });
  const canAdd = canSell && dailyPrice !== undefined && unitPriceCents !== null;

  function addToCart() {
    if (!canAdd) return;
    const selection: LineSelection =
      product.unit === "kg" ? { priceSource, grams } : { priceSource, quantity };
    if (onAdd(selection)) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="product-sheet-title"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-0 mt-auto max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border-0 bg-cream-50 p-0 text-stone-900 shadow-2xl backdrop:bg-stone-900/40 open:flex sm:m-auto sm:rounded-3xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 p-5">
        <div>
          <h2 id="product-sheet-title" className="text-2xl font-black leading-tight">
            {product.name}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
            {categoryName} · {product.unit === "kg" ? "por kilo" : "por pieza"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="min-h-12 min-w-12 rounded-full border border-stone-300 bg-white text-2xl font-bold leading-none text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
        >
          ×
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {availablePrices.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-stone-900">Precio</legend>
            <div className="flex flex-wrap gap-2">
              {availablePrices.map(({ source, cents }) => (
                <button
                  key={source}
                  type="button"
                  aria-pressed={priceSource === source}
                  onClick={() => setPriceSource(source)}
                  className={`min-h-12 rounded-xl border px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
                    priceSource === source
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {SOURCE_LABEL[source]} {formatCents(cents)}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="mt-5">
          <p className="mb-2 text-sm font-bold text-stone-900">
            {product.unit === "kg" ? "Peso" : "Cantidad"}
          </p>
          {product.unit === "kg" ? (
            <WeightControls grams={grams} onChange={setGrams} />
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Disminuir cantidad de ${product.name}`}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                −
              </button>
              <span className="min-w-12 text-center text-2xl font-black tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                aria-label={`Aumentar cantidad de ${product.name}`}
                onClick={() => setQuantity((current) => Math.min(999, current + 1))}
                className="min-h-12 min-w-12 rounded-xl border border-stone-300 bg-white text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                +
              </button>
            </div>
          )}
        </div>

        {!canSell ? (
          <p role="status" className="mt-4 text-sm font-semibold text-amber-900">
            Abre Precios del día para cargar la hoja de hoy.
          </p>
        ) : null}
        {canSell && !dailyPrice ? (
          <p role="status" className="mt-4 text-sm font-semibold text-amber-900">
            Este producto no tiene precio en la hoja de hoy.
          </p>
        ) : null}
      </div>

      <footer className="shrink-0 border-t border-stone-200 bg-cream-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Total de la línea
            </p>
            <p className="text-2xl font-black tabular-nums text-stone-900">
              {totalCents === null ? "—" : formatCents(totalCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!canAdd}
            className="min-h-14 rounded-2xl bg-brand-600 px-6 text-base font-black text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            Agregar
          </button>
        </div>
      </footer>
    </dialog>
  );
}
