import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/pos/ProductCard";
import { makeCatalog } from "@/test/fixtures";
import type { Cents } from "@/types/catalog";
import type { DailyPrice } from "@/types/dailyPrice";

function productBySku(sku: string) {
  const product = makeCatalog().products.find((item) => item.sku === sku);
  if (!product) {
    throw new Error(`Producto de prueba no encontrado: ${sku}`);
  }
  return product;
}

describe("ProductCard", () => {
  it("agrega el producto al tocarlo", () => {
    const onSelect = vi.fn();
    render(
      <ProductCard product={productBySku("PIERNA-MUSLO")} categoryName="Pollo" onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Agregar Pierna y muslo al carrito" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("muestra nombre, categoría, unidad, precio por defecto y promoción", () => {
    render(<ProductCard product={productBySku("PIERNA-MUSLO")} categoryName="Pollo" />);

    expect(screen.getByText("Pierna y muslo")).toBeInTheDocument();
    expect(screen.getByText("Pollo")).toBeInTheDocument();
    expect(screen.getByText("por kilo")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("promo $130.00")).toBeInTheDocument();
  });

  it("muestra 'por pieza' y omite la promo cuando no existe", () => {
    render(<ProductCard product={productBySku("COMBO-1")} categoryName="Promociones" />);

    expect(screen.getByText("Promociones")).toBeInTheDocument();
    expect(screen.getByText("por pieza")).toBeInTheDocument();
    expect(screen.getByText("$299.00")).toBeInTheDocument();
    expect(screen.queryByText(/^promo /i)).not.toBeInTheDocument();
  });

  it("usa la hoja del día aunque la promoción esté vacía, sin volver al catálogo", () => {
    const dailyPrice: DailyPrice = {
      id: "2026-11-13:prd-pierna",
      businessDate: "2026-11-13",
      productId: "prd-pierna",
      unit: "kg",
      normalPriceCents: 16000 as Cents,
      promotionPriceCents: null,
      wholesalePriceCents: 14500 as Cents,
      updatedAtUtc: "2026-11-13T15:00:00.000Z",
    };

    render(
      <ProductCard product={productBySku("PIERNA-MUSLO")} categoryName="Pollo" dailyPrice={dailyPrice} />,
    );

    expect(screen.getByText("$160.00")).toBeInTheDocument();
    expect(screen.queryByText(/^promo /i)).not.toBeInTheDocument();
    expect(screen.getByText("mayoreo $145.00")).toBeInTheDocument();
  });

  it("trunca nombres largos sin romper la tarjeta", () => {
    const product = { ...productBySku("PIERNA-MUSLO"), name: "Pierna y muslo con piel bien dorada" };

    render(<ProductCard product={product} categoryName="Pollo" />);

    expect(screen.getByText("Pierna y muslo con piel bien dorada")).toHaveClass("line-clamp-2");
  });
});
