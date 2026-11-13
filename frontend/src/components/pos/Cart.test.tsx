import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Cart } from "@/components/pos/Cart";
import type { Cents } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CartState } from "@/types/sale";

const dailyPrice: DailyPrice = {
  id: "2026-11-13:prd-pierna",
  businessDate: "2026-11-13",
  productId: "prd-pierna",
  unit: "kg",
  normalPriceCents: 15000 as Cents,
  promotionPriceCents: 13000 as Cents,
  wholesalePriceCents: null,
  updatedAtUtc: "2026-11-13T15:00:00.000Z",
};

function cart(overrides: Partial<CartState> = {}): CartState {
  return {
    paymentMethod: "cash",
    lines: [
      {
        lineId: "line-1",
        productId: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        categoryName: "Pollo",
        unit: "kg",
        quantity: 1,
        grams: 500 as never,
        priceSource: "lista",
        catalogUnitPriceCents: 15000 as Cents,
        unitPriceCents: 15000 as Cents,
        lineTotalCents: 7500 as Cents,
      },
    ],
    ...overrides,
  };
}

function renderCart(overrides: {
  cart?: CartState;
  canCheckout?: boolean;
  saving?: boolean;
  error?: string | null;
  onAction?: (action: unknown) => void;
  onCheckout?: () => void;
} = {}) {
  const onAction = overrides.onAction ?? vi.fn();
  const onCheckout = overrides.onCheckout ?? vi.fn();
  render(
    <Cart
      cart={overrides.cart ?? cart()}
      dailyPrices={[dailyPrice]}
      canCheckout={overrides.canCheckout ?? true}
      saving={overrides.saving ?? false}
      error={overrides.error ?? null}
      success={null}
      onAction={onAction}
      onCheckout={onCheckout}
    />,
  );
  return { onAction, onCheckout };
}

describe("Cart", () => {
  it("muestra el total con los gramos elegidos", () => {
    renderCart();

    expect(screen.getAllByText("$75.00")).toHaveLength(2);
    expect(screen.getAllByText("0.500 kg")).toHaveLength(2);
  });

  it("envía el ajuste de peso y el cambio de precio", () => {
    const { onAction } = renderCart();

    fireEvent.click(screen.getByRole("button", { name: "Aumentar 250 gramos" }));
    expect(onAction).toHaveBeenCalledWith({
      type: "setWeight",
      lineId: "line-1",
      grams: 750,
    });

    fireEvent.click(screen.getByRole("button", { name: /Promoción \$130.00/ }));
    expect(onAction).toHaveBeenCalledWith({
      type: "selectPrice",
      lineId: "line-1",
      source: "promocion",
      dailyPrice,
    });
  });

  it("confirma la venta y cambia el método de pago", () => {
    const { onAction, onCheckout } = renderCart();

    fireEvent.click(screen.getByRole("button", { name: "Tarjeta" }));
    expect(onAction).toHaveBeenCalledWith({ type: "setPayment", paymentMethod: "card" });

    fireEvent.click(screen.getByRole("button", { name: "Confirmar venta" }));
    expect(onCheckout).toHaveBeenCalled();
  });

  it("mantiene visible el botón de confirmar y lo deshabilita con el carrito vacío", () => {
    renderCart({ cart: cart({ lines: [] }) });

    expect(screen.getByText("Toca un producto para agregarlo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar venta" })).toBeDisabled();
  });

  it("deshabilita confirmar mientras guarda la venta", () => {
    renderCart({ saving: true });

    expect(screen.getByRole("button", { name: "Guardando venta…" })).toBeDisabled();
  });

  it("ofrece atajos de peso y los tres métodos con efectivo activo", () => {
    const { onAction } = renderCart();

    for (const label of ["0.500 kg", "1.000 kg", "1.500 kg", "2.000 kg"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "2.000 kg" }));
    expect(onAction).toHaveBeenCalledWith({ type: "setWeight", lineId: "line-1", grams: 2000 });
    expect(screen.getByRole("button", { name: "Efectivo" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Tarjeta" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Transferencia" })).toBeInTheDocument();
  });

  it("avisa por qué no se puede cobrar y enfoca el error", () => {
    renderCart({ canCheckout: false, error: "Los precios no son de hoy." });

    expect(
      screen.getByText("Revisa Precios del día: faltan precios de hoy para cobrar."),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Los precios no son de hoy.");
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Confirmar venta" })).toBeDisabled();
  });
});
