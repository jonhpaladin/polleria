import { describe, expect, it } from "vitest";

import { cartReducer, cartTotalCents, EMPTY_CART } from "@/lib/cart";
import { makeCatalog } from "@/test/fixtures";
import type { Cents } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";

const catalog = makeCatalog();
const pierna = catalog.products.find((product) => product.id === "prd-pierna")!;
const combo = catalog.products.find((product) => product.id === "prd-combo")!;

function dailyPrice(overrides: Partial<DailyPrice> = {}): DailyPrice {
  return {
    id: "2026-11-13:prd-pierna",
    businessDate: "2026-11-13",
    productId: "prd-pierna",
    unit: "kg",
    normalPriceCents: 15000 as Cents,
    promotionPriceCents: 13000 as Cents,
    wholesalePriceCents: null,
    updatedAtUtc: "2026-11-13T15:00:00.000Z",
    ...overrides,
  };
}

function withPierna(price = dailyPrice()) {
  return cartReducer(EMPTY_CART, {
    type: "addProduct",
    product: pierna,
    categoryName: "Pollo",
    dailyPrice: price,
  });
}

describe("cartReducer", () => {
  it("agrega una línea por kilo con un kilo inicial y precio normal", () => {
    const cart = withPierna();

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({
      productId: "prd-pierna",
      unit: "kg",
      grams: 1000,
      priceSource: "lista",
      unitPriceCents: 15000,
      lineTotalCents: 15000,
    });
  });

  it("calcula el importe por gramos con redondeo half-up al centavo", () => {
    const cart = withPierna(dailyPrice({ normalPriceCents: 15002 as Cents }));
    const lineId = cart.lines[0]!.lineId;

    const result = cartReducer(cart, {
      type: "setWeight",
      lineId,
      grams: 250 as never,
    });

    expect(result.lines[0]!.lineTotalCents).toBe(3751);
  });

  it("guarda el precio de catálogo como referencia aunque la hoja del día cambie", () => {
    const cart = withPierna(dailyPrice({ normalPriceCents: 16000 as Cents }));

    expect(cart.lines[0]!.catalogUnitPriceCents).toBe(15000);
    expect(cart.lines[0]!.unitPriceCents).toBe(16000);
  });

  it("ajusta ±250 g y respeta el mínimo de 250 g", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;

    const stepOne = cartReducer(cart, { type: "adjustWeight", lineId, delta: -1 });
    const stepTwo = cartReducer(stepOne, { type: "adjustWeight", lineId, delta: -1 });
    const stepUp = cartReducer(stepTwo, { type: "adjustWeight", lineId, delta: 1 });

    expect(stepOne.lines[0]!.grams).toBe(750);
    expect(stepTwo.lines[0]!.grams).toBe(500);
    expect(stepUp.lines[0]!.grams).toBe(750);
  });

  it("no permite bajar de 250 g", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;
    const atMinimum = cartReducer(cart, { type: "setWeight", lineId, grams: 250 as never });

    expect(() => cartReducer(atMinimum, { type: "adjustWeight", lineId, delta: -1 })).toThrow(
      "Peso inválido",
    );
  });

  it("mantiene separadas dos líneas por kilo del mismo producto", () => {
    const first = withPierna();
    const second = cartReducer(first, {
      type: "addProduct",
      product: pierna,
      categoryName: "Pollo",
      dailyPrice: dailyPrice(),
    });

    expect(second.lines).toHaveLength(2);
    expect(second.lines[0]!.lineId).not.toBe(second.lines[1]!.lineId);
  });

  it("redondea 99.99 por kilo a 250 g en 2500 centavos", () => {
    const cart = withPierna(dailyPrice({ normalPriceCents: 9999 as Cents }));
    const lineId = cart.lines[0]!.lineId;

    const result = cartReducer(cart, { type: "setWeight", lineId, grams: 250 as never });

    expect(result.lines[0]!.lineTotalCents).toBe(2500);
  });

  it("incrementa y decrementa piezas sin bajar de una", () => {
    const piecePrice = dailyPrice({
      id: "2026-11-13:prd-combo",
      productId: "prd-combo",
      unit: "piece",
      normalPriceCents: 29900 as Cents,
      promotionPriceCents: null,
    });
    const base = cartReducer(EMPTY_CART, {
      type: "addProduct",
      product: combo,
      categoryName: "Promociones",
      dailyPrice: piecePrice,
    });
    const lineId = base.lines[0]!.lineId;

    const two = cartReducer(base, { type: "incrementPiece", lineId });
    const one = cartReducer(two, { type: "decrementPiece", lineId });
    const stillOne = cartReducer(one, { type: "decrementPiece", lineId });

    expect(two.lines[0]!.quantity).toBe(2);
    expect(two.lines[0]!.lineTotalCents).toBe(59800);
    expect(one.lines[0]!.quantity).toBe(1);
    expect(stillOne.lines[0]!.quantity).toBe(1);
  });

  it("conserva las líneas y el total al cambiar el método de pago", () => {
    const cart = withPierna();

    const result = cartReducer(cart, { type: "setPayment", paymentMethod: "card" });

    expect(result.paymentMethod).toBe("card");
    expect(result.lines).toEqual(cart.lines);
    expect(cartTotalCents(result)).toBe(15000);
  });

  it("cambia entre normal, promoción y mayoreo solo si existe", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;

    const promo = cartReducer(cart, {
      type: "selectPrice",
      lineId,
      source: "promocion",
      dailyPrice: dailyPrice(),
    });
    expect(promo.lines[0]!.priceSource).toBe("promocion");
    expect(promo.lines[0]!.lineTotalCents).toBe(13000);

    const wholesale = cartReducer(promo, {
      type: "selectPrice",
      lineId,
      source: "mayoreo",
      dailyPrice: dailyPrice(),
    });
    expect(wholesale.lines[0]!.priceSource).toBe("promocion");
    expect(wholesale.lines[0]!.lineTotalCents).toBe(13000);
  });

  it("aplica un precio manual positivo y recalcula el importe de la línea", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;

    const result = cartReducer(cart, {
      type: "setManualPrice",
      lineId,
      unitPriceCents: 17550 as Cents,
    });

    expect(result.lines[0]!.priceSource).toBe("manual");
    expect(result.lines[0]!.unitPriceCents).toBe(17550);
    expect(result.lines[0]!.lineTotalCents).toBe(17550);
    expect(result.lines[0]!.catalogUnitPriceCents).toBe(15000);
  });

  it("ignora un precio manual en cero, negativo o no entero", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;

    for (const value of [0, -100, 150.5]) {
      const result = cartReducer(cart, {
        type: "setManualPrice",
        lineId,
        unitPriceCents: value as Cents,
      });
      expect(result.lines[0]!.priceSource).toBe("lista");
      expect(result.lines[0]!.unitPriceCents).toBe(15000);
    }
  });

  it("acumula piezas del mismo producto y precio", () => {
    const first = cartReducer(EMPTY_CART, {
      type: "addProduct",
      product: combo,
      categoryName: "Promociones",
      dailyPrice: dailyPrice({
        id: "2026-11-13:prd-combo",
        productId: "prd-combo",
        unit: "piece",
        normalPriceCents: 29900 as Cents,
        promotionPriceCents: null,
      }),
    });
    const second = cartReducer(first, {
      type: "addProduct",
      product: combo,
      categoryName: "Promociones",
      dailyPrice: dailyPrice({
        id: "2026-11-13:prd-combo",
        productId: "prd-combo",
        unit: "piece",
        normalPriceCents: 29900 as Cents,
        promotionPriceCents: null,
      }),
    });

    expect(second.lines).toHaveLength(1);
    expect(second.lines[0]!.quantity).toBe(2);
    expect(cartTotalCents(second)).toBe(59800);
  });

  it("quita líneas y limpia el carrito", () => {
    const cart = withPierna();
    const lineId = cart.lines[0]!.lineId;

    expect(cartReducer(cart, { type: "removeLine", lineId }).lines).toHaveLength(0);
    expect(cartReducer(cart, { type: "clear" })).toEqual(EMPTY_CART);
  });

  it("mantiene efectivo como método por defecto", () => {
    expect(withPierna().paymentMethod).toBe("cash");
  });
});
