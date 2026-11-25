import { useState } from "react";

import { defaultPrice, promoPrice } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { fallbackInitial, productImageUrl } from "@/lib/productImages";
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
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = productImageUrl(product.sku);
  const showImage = imageUrl !== null && !imageFailed;

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
      aria-label={`Ver ${product.name}`}
      className="group relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-brand-300 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      {showImage ? (
        <>
          <img
            data-testid="product-image"
            src={imageUrl}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/35 to-stone-950/5"
          />
        </>
      ) : (
        <div
          data-testid="product-fallback"
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 via-accent-100 to-cream-50"
        >
          <span aria-hidden="true" className="text-6xl font-black text-brand-700 sm:text-7xl">
            {fallbackInitial(product.name)}
          </span>
        </div>
      )}

      <div className="relative space-y-1">
        <h3
          className={`line-clamp-2 text-base font-bold leading-tight sm:text-lg ${
            showImage ? "text-white" : "text-stone-900"
          }`}
        >
          {product.name}
        </h3>
        <p
          className={`flex flex-wrap items-center gap-x-1 text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs ${
            showImage ? "text-white/85" : "text-stone-500"
          }`}
        >
          <span>{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span>{UNIT_LABEL[product.unit]}</span>
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
          <span
            className={`text-xl font-black tabular-nums sm:text-2xl ${
              showImage ? "text-white" : "text-stone-900"
            }`}
          >
            {normalPriceCents !== undefined ? formatCents(normalPriceCents) : "—"}
          </span>
          {promotionPriceCents !== null ? (
            <span className="rounded-full bg-accent-300 px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-accent-700 sm:text-xs">
              promo {formatCents(promotionPriceCents)}
            </span>
          ) : null}
          {wholesalePriceCents !== null ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums sm:text-xs ${
                showImage ? "bg-white/90 text-brand-700" : "bg-brand-50 text-brand-700"
              }`}
            >
              mayoreo {formatCents(wholesalePriceCents)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
