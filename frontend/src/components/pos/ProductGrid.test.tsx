import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductGrid } from "@/components/pos/ProductGrid";
import { makeCatalog } from "@/test/fixtures";

describe("ProductGrid", () => {
  it("muestra un estado de carga", () => {
    render(<ProductGrid products={[]} categories={[]} loading />);

    expect(screen.getByText("Cargando catálogo…")).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay productos", () => {
    render(<ProductGrid products={[]} categories={[]} loading={false} />);

    expect(screen.getByText("No hay productos en esta categoría")).toBeInTheDocument();
  });

  it("pinta una tarjeta por producto con su categoría", () => {
    const catalog = makeCatalog();

    render(
      <ProductGrid products={catalog.products} categories={catalog.categories} loading={false} />,
    );

    expect(screen.getByText("Pierna y muslo")).toBeInTheDocument();
    expect(screen.getByText("Combo familiar")).toBeInTheDocument();
    expect(screen.getByText("Pollo")).toBeInTheDocument();
    expect(screen.getByText("Promociones")).toBeInTheDocument();
  });
});
