import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/components/pos/ProductCard";
import { makeCatalog } from "@/test/fixtures";

function productBySku(sku: string) {
  const product = makeCatalog().products.find((item) => item.sku === sku);
  if (!product) {
    throw new Error(`Producto de prueba no encontrado: ${sku}`);
  }
  return product;
}

describe("ProductCard", () => {
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

  it("trunca nombres largos sin romper la tarjeta", () => {
    const product = { ...productBySku("PIERNA-MUSLO"), name: "Pierna y muslo con piel bien dorada" };

    render(<ProductCard product={product} categoryName="Pollo" />);

    expect(screen.getByText("Pierna y muslo con piel bien dorada")).toHaveClass("line-clamp-2");
  });
});
