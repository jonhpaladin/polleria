import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CartLine } from "@/components/pos/CartLine";
import type { Cents } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";
import type { CartLine as CartLineType } from "@/types/sale";

const dailyPrice: DailyPrice = {
  id: "2026-11-13:prd-pierna",
  businessDate: "2026-11-13",
  productId: "prd-pierna",
  unit: "kg",
  normalPriceCents: 15000 as Cents,
  promotionPriceCents: 13000 as Cents,
  wholesalePriceCents: 14500 as Cents,
  updatedAtUtc: "2026-11-13T15:00:00.000Z",
};

function line(overrides: Partial<CartLineType> = {}): CartLineType {
  return {
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
    ...overrides,
  };
}

function renderLine(overrides: Partial<CartLineType> = {}) {
  const onAction = vi.fn();
  render(<CartLine line={line(overrides)} dailyPrice={dailyPrice} onAction={onAction} />);
  return onAction;
}

describe("CartLine precio manual", () => {
  it("abre la captura manual y aplica el precio validado en centavos", () => {
    const onAction = renderLine();

    fireEvent.click(screen.getByRole("button", { name: "Precio manual" }));
    fireEvent.change(screen.getByLabelText("Precio manual de Pierna y muslo"), {
      target: { value: "175.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onAction).toHaveBeenCalledWith({
      type: "setManualPrice",
      lineId: "line-1",
      unitPriceCents: 17550,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("muestra el error y no aplica un precio inválido", () => {
    const onAction = renderLine();

    fireEvent.click(screen.getByRole("button", { name: "Precio manual" }));
    fireEvent.change(screen.getByLabelText("Precio manual de Pierna y muslo"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("mayor que cero");
    expect(onAction).not.toHaveBeenCalled();
  });

  it("muestra el origen Manual cuando la línea ya lo usa", () => {
    renderLine({ priceSource: "manual", unitPriceCents: 17550 as Cents, lineTotalCents: 8775 as Cents });

    expect(screen.getByText(/Manual/)).toBeInTheDocument();
    expect(screen.getByLabelText("Precio manual de Pierna y muslo")).toHaveValue("175.50");
  });
});
