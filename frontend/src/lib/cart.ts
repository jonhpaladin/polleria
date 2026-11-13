import { defaultPrice } from "@/lib/catalog";
import { selectDailyPrice } from "@/lib/dailyPrices";
import { sumCents } from "@/lib/money";
import { assertGrams, GRAM_STEP } from "@/lib/weight";
import type { Product } from "@/types/catalog";
import type { DailyPrice, DailyPriceSource } from "@/types/dailyPrice";
import type { CartLine, CartState, Grams, PriceSource } from "@/types/sale";

export type CartAction =
  | { type: "addProduct"; product: Product; categoryName: string; dailyPrice: DailyPrice }
  | { type: "removeLine"; lineId: string }
  | { type: "incrementPiece"; lineId: string }
  | { type: "decrementPiece"; lineId: string }
  | { type: "setWeight"; lineId: string; grams: Grams }
  | { type: "adjustWeight"; lineId: string; delta: -1 | 1 }
  | { type: "selectPrice"; lineId: string; source: DailyPriceSource; dailyPrice: DailyPrice }
  | { type: "setManualPrice"; lineId: string; unitPriceCents: CartLine["unitPriceCents"] }
  | { type: "setPayment"; paymentMethod: CartState["paymentMethod"] }
  | { type: "clear" };

export const EMPTY_CART: CartState = { lines: [], paymentMethod: "cash" };

/** Importe de una línea con redondeo half-up al centavo, una sola vez. */
export function lineTotalCents(
  unitPriceCents: CartLine["unitPriceCents"],
  line: Pick<CartLine, "unit" | "quantity" | "grams">,
): CartLine["lineTotalCents"] {
  if (line.unit === "piece") {
    return (unitPriceCents * line.quantity) as CartLine["lineTotalCents"];
  }
  const grams = line.grams;
  if (grams === null) throw new Error("Una línea por kilo necesita gramos");
  return Math.floor((unitPriceCents * grams + 500) / 1000) as CartLine["lineTotalCents"];
}

function createLine(product: Product, categoryName: string, dailyPrice: DailyPrice): CartLine {
  const grams = product.unit === "kg" ? assertGrams(1000) : null;
  const unitPriceCents = dailyPrice.normalPriceCents;
  const line = {
    lineId: crypto.randomUUID(),
    productId: product.id,
    sku: product.sku,
    name: product.name,
    categoryName,
    unit: product.unit,
    quantity: 1,
    grams,
    priceSource: "lista" as PriceSource,
    catalogUnitPriceCents: defaultPrice(product)?.priceCents ?? dailyPrice.normalPriceCents,
    unitPriceCents,
    lineTotalCents: 0 as CartLine["lineTotalCents"],
  };
  return { ...line, lineTotalCents: lineTotalCents(unitPriceCents, line) };
}

function recalculate(line: CartLine, unitPriceCents = line.unitPriceCents): CartLine {
  return { ...line, unitPriceCents, lineTotalCents: lineTotalCents(unitPriceCents, line) };
}

function updateLine(lines: readonly CartLine[], lineId: string, update: (line: CartLine) => CartLine): CartLine[] {
  return lines.map((line) => (line.lineId === lineId ? update(line) : line));
}

export function cartTotalCents(state: CartState) {
  return sumCents(state.lines.map((line) => line.lineTotalCents));
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "addProduct": {
      const line = createLine(action.product, action.categoryName, action.dailyPrice);
      if (action.product.unit === "piece") {
        const existing = state.lines.find(
          (item) => item.productId === line.productId && item.unitPriceCents === line.unitPriceCents && item.priceSource === line.priceSource,
        );
        if (existing) {
          return {
            ...state,
            lines: updateLine(state.lines, existing.lineId, (current) =>
              recalculate({ ...current, quantity: current.quantity + 1 }),
            ),
          };
        }
      }
      return { ...state, lines: [...state.lines, line] };
    }
    case "removeLine":
      return { ...state, lines: state.lines.filter((line) => line.lineId !== action.lineId) };
    case "incrementPiece":
      return { ...state, lines: updateLine(state.lines, action.lineId, (line) => recalculate({ ...line, quantity: line.quantity + 1 })) };
    case "decrementPiece":
      return {
        ...state,
        lines: updateLine(state.lines, action.lineId, (line) => recalculate({ ...line, quantity: Math.max(1, line.quantity - 1) })),
      };
    case "setWeight":
      return { ...state, lines: updateLine(state.lines, action.lineId, (line) => recalculate({ ...line, grams: assertGrams(action.grams) })) };
    case "adjustWeight":
      return {
        ...state,
        lines: updateLine(state.lines, action.lineId, (line) => {
          if (line.grams === null) return line;
          return recalculate({ ...line, grams: assertGrams(line.grams + action.delta * GRAM_STEP) });
        }),
      };
    case "selectPrice": {
      const price = selectDailyPrice(action.dailyPrice, action.source);
      if (price === null) return state;
      return {
        ...state,
        lines: updateLine(state.lines, action.lineId, (line) => recalculate({ ...line, priceSource: action.source, unitPriceCents: price })),
      };
    }
    case "setManualPrice": {
      // El precio manual ya viene validado por la UI; aquí solo se descarta lo imposible.
      const price = action.unitPriceCents;
      if (!Number.isSafeInteger(price) || price <= 0) return state;
      return {
        ...state,
        lines: updateLine(state.lines, action.lineId, (line) =>
          recalculate({ ...line, priceSource: "manual", unitPriceCents: price }),
        ),
      };
    }
    case "setPayment":
      return { ...state, paymentMethod: action.paymentMethod };
    case "clear":
      return EMPTY_CART;
  }
}
