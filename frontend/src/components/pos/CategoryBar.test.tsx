import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryBar } from "@/components/pos/CategoryBar";
import { makeCatalog } from "@/test/fixtures";

describe("CategoryBar", () => {
  const catalog = makeCatalog();
  const categories = catalog.categories;

  it("muestra 'Todos' y las categorías visibles", () => {
    render(<CategoryBar categories={categories} selected="all" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pollo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promociones" })).toBeInTheDocument();
  });

  it("marca la categoría activa con aria-pressed", () => {
    render(<CategoryBar categories={categories} selected="cat-pollo" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pollo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false");
  });

  it("notifica la categoría tocada", async () => {
    const onSelect = vi.fn();
    render(<CategoryBar categories={categories} selected="all" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: "Promociones" }));

    expect(onSelect).toHaveBeenCalledWith("cat-promos");
  });

  it("usa objetivos táctiles de al menos 48 px", () => {
    render(<CategoryBar categories={categories} selected="all" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Todos" })).toHaveClass("min-h-12");
  });
});
