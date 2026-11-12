import { defaultPrice, promoPrice } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import type { Product } from "@/types/catalog";

const UNIT_LABEL = { kg: "por kilo", piece: "por pieza" } as const;

/** Presentación pura: no lee red, IndexedDB ni estado global. */
export function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const price = defaultPrice(product);
  const promo = promoPrice(product);

  return (
    <article className="flex min-h-40 flex-col justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
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
          {price ? formatCents(price.priceCents) : "—"}
        </span>
        {promo && !promo.isDefault ? (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-sm font-semibold tabular-nums text-amber-900">
            promo {formatCents(promo.priceCents)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
