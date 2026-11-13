import { useCallback, useReducer, useRef, useState } from "react";

import { cartReducer, EMPTY_CART, type CartAction } from "@/lib/cart";
import { businessDate } from "@/lib/dailyPrices";
import { formatCents } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payment";
import { persistTicket } from "@/lib/ticketRepository";
import type { Catalog } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CartState } from "@/types/sale";

export interface UseSaleResult {
  cart: CartState;
  dispatch: (action: CartAction) => void;
  addProduct: (productId: string, categoryName: string) => void;
  canCheckout: boolean;
  saving: boolean;
  error: string | null;
  success: string | null;
  checkout: () => Promise<void>;
}

/**
 * Estado del carrito y confirmación local. El cobro nunca espera la red:
 * el ticket y su outbox se escriben en una sola transacción de IndexedDB.
 */
export function useSale(
  catalog: Catalog | null,
  dailyPrices: readonly DailyPrice[],
  pricesReady: boolean,
  isToday = true,
  pricesDate: string | null = null,
): UseSaleResult {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inFlight = useRef(false);
  const pendingUuid = useRef<string | null>(null);

  // Se evalúa al agregar y al cobrar: el render puede quedar viejo si la app
  // cruza la medianoche sin foco ni cambio de estado.
  const pricesAreStale = useCallback(
    () => pricesDate !== null && pricesDate !== businessDate(new Date()),
    [pricesDate],
  );

  const canCheckout =
    pricesReady &&
    isToday &&
    cart.lines.length > 0 &&
    cart.lines.every((line) => dailyPrices.some((row) => row.productId === line.productId));

  const addProduct = useCallback(
    (productId: string, categoryName: string) => {
      const product = catalog?.products.find((item) => item.id === productId);
      const dailyPrice = dailyPrices.find((row) => row.productId === productId);
      if (!product) return;
      if (!isToday || pricesAreStale()) {
        setError("Los precios no son de hoy. Abre Precios del día para cargar la hoja de hoy.");
        return;
      }
      if (!dailyPrice) {
        setError("Abre Precios del día para cargar los precios de hoy.");
        return;
      }
      setError(null);
      setSuccess(null);
      dispatch({ type: "addProduct", product, categoryName, dailyPrice });
    },
    [catalog, dailyPrices, isToday, pricesAreStale],
  );

  const checkout = useCallback(async () => {
    if (!catalog) return;
    if (inFlight.current) return;
    if (!isToday || pricesAreStale()) {
      setError("Los precios no son de hoy. Abre Precios del día antes de cobrar.");
      return;
    }
    if (cart.lines.length === 0) {
      setError("Agrega al menos un producto antes de cobrar.");
      return;
    }
    inFlight.current = true;
    pendingUuid.current ??= crypto.randomUUID();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await persistTicket(
        cart,
        catalog.updatedAt,
        new Date(),
        pendingUuid.current,
      );
      pendingUuid.current = null;
      const total = formatCents(result.ticket.totalCents);
      const method = PAYMENT_LABEL[result.ticket.paymentMethod];
      dispatch({ type: "clear" });
      setSuccess(
        `Venta confirmada: ${total} en ${method}. Folio local ${result.ticket.localFolio}.`,
      );
    } catch (cause: unknown) {
      setError("No se pudo guardar la venta. No se cobró nada; vuelve a intentar.");
      console.warn("TICKET_PERSIST_FAILED", cause);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [cart, catalog, isToday, pricesAreStale]);

  return {
    cart,
    dispatch,
    addProduct,
    canCheckout,
    saving,
    error,
    success,
    checkout,
  };
}
