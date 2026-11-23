import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductSheet } from "@/components/pos/ProductSheet";
import type { LineSelection } from "@/lib/cart";
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
    wholesalePriceCents: 14500 as Cents,
    updatedAtUtc: "2026-11-13T15:00:00.000Z",
    ...overrides,
  };
}

interface RenderOptions {
  product?: typeof pierna;
  categoryName?: string;
  dailyPrice?: DailyPrice;
  canSell?: boolean;
  onAdd?: (selection: LineSelection) => boolean;
  onClose?: () => void;
}

function renderSheet(overrides: RenderOptions = {}) {
  const onAdd = overrides.onAdd ?? vi.fn(() => true);
  const onClose = overrides.onClose ?? vi.fn();
  render(
    <ProductSheet
      product={overrides.product ?? pierna}
      categoryName={overrides.categoryName ?? "Pollo"}
      dailyPrice={"dailyPrice" in overrides ? overrides.dailyPrice : dailyPrice()}
      canSell={overrides.canSell ?? true}
      onAdd={onAdd}
      onClose={onClose}
    />,
  );
  return { onAdd, onClose };
}

describe("ProductSheet", () => {
  it("abre el detalle sin agregar nada", () => {
    const { onAdd } = renderSheet();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pierna y muslo" })).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("agrega el peso y la promoción elegidos y se cierra", () => {
    const { onAdd, onClose } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "0.500 kg" }));
    fireEvent.click(screen.getByRole("button", { name: /Promoción \$130\.00/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAdd).toHaveBeenCalledWith({ priceSource: "promocion", grams: 500 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("agrega varias piezas con mayoreo", () => {
    const { onAdd } = renderSheet({
      product: combo,
      categoryName: "Promociones",
      dailyPrice: dailyPrice({
        id: "2026-11-13:prd-combo",
        productId: "prd-combo",
        unit: "piece",
        normalPriceCents: 29900 as Cents,
        promotionPriceCents: null,
        wholesalePriceCents: 25000 as Cents,
      }),
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar cantidad de Combo familiar" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar cantidad de Combo familiar" }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Mayoreo \$250\.00/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onAdd).toHaveBeenCalledWith({ priceSource: "mayoreo", quantity: 3 });
  });

  it("no agrega si falta el precio del día", () => {
    const { onAdd } = renderSheet({ dailyPrice: undefined });

    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
    expect(
      screen.getByText("Este producto no tiene precio en la hoja de hoy."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("no agrega si la hoja no es de hoy", () => {
    renderSheet({ canSell: false });

    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
    expect(
      screen.getByText("Abre Precios del día para cargar la hoja de hoy."),
    ).toBeInTheDocument();
  });

  it("se cierra con la X", () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se cierra con Escape", () => {
    const { onClose } = renderSheet();

    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("se cierra al tocar el fondo y no al tocar su contenido", () => {
    const { onClose } = renderSheet();

    fireEvent.click(screen.getByRole("heading", { name: "Pierna y muslo" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
