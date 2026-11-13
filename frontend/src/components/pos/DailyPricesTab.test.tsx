import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DailyPricesTab } from "@/components/pos/DailyPricesTab";
import { buildBaseDailyPrices } from "@/lib/dailyPrices";
import { makeCatalog } from "@/test/fixtures";
import type { Cents } from "@/types/catalog";

const catalog = makeCatalog();
const rows = buildBaseDailyPrices(catalog, "2026-11-13", "2026-11-13T15:00:00.000Z");

function renderTab(onSave = vi.fn().mockResolvedValue(true)) {
  render(
    <DailyPricesTab
      catalog={catalog}
      rows={rows}
      businessDate="2026-11-13"
      loading={false}
      saving={false}
      canSave
      error={null}
      onSave={onSave}
    />,
  );
  return onSave;
}

describe("DailyPricesTab", () => {
  it("muestra la fecha y los tres niveles por producto", () => {
    renderTab();

    expect(screen.getByText("2026-11-13")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio normal de Pierna y muslo")).toHaveValue("150.00");
    expect(screen.getByLabelText("Precio de promoción de Pierna y muslo")).toHaveValue("130.00");
    expect(screen.getByLabelText("Precio de mayoreo de Pierna y muslo")).toHaveValue("");
  });

  it("envía los cambios capturados al guardar", async () => {
    const onSave = renderTab();

    fireEvent.change(screen.getByLabelText("Precio de mayoreo de Pierna y muslo"), {
      target: { value: "145.50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));

    expect(onSave).toHaveBeenCalledWith([
      { productId: "prd-combo", normal: "299.00", promotion: "", wholesale: "" },
      { productId: "prd-pierna", normal: "150.00", promotion: "130.00", wholesale: "145.50" },
    ]);
    expect(await screen.findByText("Precios del día guardados.")).toBeInTheDocument();
  });

  it("muestra el error junto al campo y no guarda un precio inválido", () => {
    const onSave = renderTab();

    fireEvent.change(screen.getByLabelText("Precio normal de Pierna y muslo"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Usa un precio como 150.00, mayor que cero.")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio normal de Pierna y muslo")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("exige el precio normal", () => {
    const onSave = renderTab();

    fireEvent.change(screen.getByLabelText("Precio normal de Pierna y muslo"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar precios" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("El precio normal es obligatorio.")).toBeInTheDocument();
  });

  it("conserva un borrador sin guardar cuando la hoja se refresca", () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { rerender } = render(
      <DailyPricesTab
        catalog={catalog}
        rows={rows}
        businessDate="2026-11-13"
        loading={false}
        saving={false}
        canSave
        error={null}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText("Precio de mayoreo de Pierna y muslo"), {
      target: { value: "145.50" },
    });

    const refreshed = rows.map((row) =>
      row.productId === "prd-pierna"
        ? { ...row, normalPriceCents: 16000 as Cents }
        : row,
    );
    rerender(
      <DailyPricesTab
        catalog={catalog}
        rows={refreshed}
        businessDate="2026-11-13"
        loading={false}
        saving={false}
        canSave
        error={null}
        onSave={onSave}
      />,
    );

    expect(screen.getByLabelText("Precio normal de Pierna y muslo")).toHaveValue("160.00");
    expect(screen.getByLabelText("Precio de mayoreo de Pierna y muslo")).toHaveValue("145.50");
  });

  it("avisa cuando la base local no permite guardar", () => {
    render(
      <DailyPricesTab
        catalog={catalog}
        rows={rows}
        businessDate="2026-11-13"
        loading={false}
        saving={false}
        canSave={false}
        error={null}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("no está disponible");
    expect(screen.getByRole("button", { name: "Guardar precios" })).toBeDisabled();
  });
});
