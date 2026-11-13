import { defaultPrice, promoPrice } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import type { Product } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";

const UNIT_LABEL = { kg: "por kilo", piece: "por pieza" } as const;

/** Control táctil puro: no lee red, IndexedDB ni estado global. */
export function ProductCard({
  product,
  categoryName,
  dailyPrice,
  onSelect,
}: {
  product: Product;
  categoryName: string;
  dailyPrice?: DailyPrice;
  onSelect?: () => void;
}) {
  const price = defaultPrice(product);
  const promo = promoPrice(product);
  const normalPriceCents = dailyPrice ? dailyPrice.normalPriceCents : price?.priceCents;
  const promotionPriceCents = dailyPrice
    ? dailyPrice.promotionPriceCents
    : (promo?.priceCents ?? null);
  const wholesalePriceCents = dailyPrice ? dailyPrice.wholesalePriceCents : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Agregar ${product.name} al carrito`}
      className="flex min-h-40 w-full flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 active:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <div>
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-stone-900">
          {product.name}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs font-medium uppercase tracking-wide text-stone-500">
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span>{UNIT_LABEL[product.unit]}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-bold tabular-nums text-stone-900">
          {normalPriceCents !== undefined ? formatCents(normalPriceCents) : "—"}
        </span>
        {promotionPriceCents !== null ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-sm font-semibold tabular-nums text-amber-900">
            promo {formatCents(promotionPriceCents)}
          </span>
        ) : null}
        {wholesalePriceCents !== null ? (
          <span className="rounded-full bg-brand-50 px-2 py-1 text-sm font-semibold tabular-nums text-brand-700">
            mayoreo {formatCents(wholesalePriceCents)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
