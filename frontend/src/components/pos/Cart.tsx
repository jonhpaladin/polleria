import { useEffect, useRef } from "react";

import { formatCents } from "@/lib/money";
import { cartTotalCents, type CartAction } from "@/lib/cart";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CartState } from "@/types/sale";
import { CartLine } from "@/components/pos/CartLine";
import { PaymentSelector } from "@/components/pos/PaymentSelector";

interface CartProps {
  cart: CartState;
  dailyPrices: DailyPrice[];
  canCheckout: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  onAction: (action: CartAction) => void;
  onCheckout: () => void;
}

export function Cart({ cart, dailyPrices, canCheckout, saving, error, success, onAction, onCheckout }: CartProps) {
  const dailyPriceByProduct = new Map(dailyPrices.map((price) => [price.productId, price]));
  const total = cartTotalCents(cart);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const successRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);

  return (
    <aside aria-labelledby="carrito-title" className="sticky bottom-0 z-10 border-t border-stone-300 bg-cream-50/98 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(28,25,23,0.08)] backdrop-blur">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="carrito-title" className="text-xl font-black text-stone-900">Carrito</h2>
          <span className="text-sm font-semibold text-stone-500">{cart.lines.length} línea{cart.lines.length === 1 ? "" : "s"}</span>
        </div>
        {cart.lines.length === 0 ? (
          <p className="py-4 text-sm text-stone-600">Toca un producto para agregarlo.</p>
        ) : (
          <ul className="max-h-[40vh] overflow-y-auto pr-1">
            {cart.lines.map((line) => (
              <CartLine key={line.lineId} line={line} dailyPrice={dailyPriceByProduct.get(line.productId)} onAction={onAction} />
            ))}
          </ul>
        )}
        <div className="mt-3 border-t border-stone-300 pt-3">
          {cart.lines.length > 0 ? (
            <>
              <PaymentSelector value={cart.paymentMethod} onChange={(paymentMethod) => onAction({ type: "setPayment", paymentMethod })} />
              <div className="mt-4 flex items-center justify-between gap-4">
                <span className="text-lg font-bold text-stone-700">Total</span>
                <span className="text-3xl font-black tabular-nums text-stone-900">{formatCents(total)}</span>
              </div>
            </>
          ) : null}
          <button
            type="button"
            onClick={onCheckout}
            disabled={!canCheckout || saving || cart.lines.length === 0}
            className="mt-3 min-h-14 w-full rounded-2xl bg-brand-600 text-base font-black text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          >
            {saving ? "Guardando venta…" : "Confirmar venta"}
          </button>
          {cart.lines.length > 0 && !canCheckout ? (
            <p className="mt-2 text-sm font-semibold text-amber-900" role="status">
              Revisa Precios del día: faltan precios de hoy para cobrar.
            </p>
          ) : null}
        </div>
        {error ? (
          <p
            ref={errorRef}
            tabIndex={-1}
            className="mt-3 text-sm font-semibold text-red-700 focus:outline-none"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? <p ref={successRef} tabIndex={-1} className="mt-3 text-sm font-semibold text-emerald-700 focus:outline-none" role="status" aria-live="polite">{success}</p> : null}
      </div>
    </aside>
  );
}
