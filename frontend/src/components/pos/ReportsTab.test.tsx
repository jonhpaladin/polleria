import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportsTab } from "@/components/pos/ReportsTab";
import type { Cents } from "@/types/catalog";
import type { CashCut, DailyReport, RemoteDailyReport } from "@/types/report";

const report: DailyReport = {
  businessDate: "2026-11-22",
  ticketCount: 2,
  totalCents: 64175 as Cents,
  averageTicketCents: 32088 as Cents,
  byPayment: { cash: 44000 as Cents, card: 20175 as Cents, transfer: 0 as Cents },
  byProduct: [
    {
      productId: "prd-pollo-asado",
      sku: "POLLO-ASADO",
      name: "Pollo asado",
      unit: "piece",
      pieces: 2,
      grams: 0,
      totalCents: 44000 as Cents,
    },
    {
      productId: "prd-pierna-muslo",
      sku: "PIERNA-MUSLO",
      name: "Pierna y muslo",
      unit: "kg",
      pieces: 0,
      grams: 1345,
      totalCents: 20175 as Cents,
    },
  ],
  byCategory: [{ name: "Pollo fresco", totalCents: 64175 as Cents }],
};

const cut: CashCut = {
  businessDate: "2026-11-22",
  openingCashCents: 10000 as Cents,
  countedCashCents: 50000 as Cents,
  expectedCashCents: 54000 as Cents,
  differenceCents: -4000,
  ticketCount: 1,
  totalCents: 44000 as Cents,
  byPayment: { cash: 44000 as Cents, card: 0 as Cents, transfer: 0 as Cents },
  closedAtUtc: "2026-11-22T23:00:00.000Z",
  recalculatedAtUtc: null,
};

const remote: RemoteDailyReport = {
  business_date: "2026-11-22",
  ticket_count: 1,
  total: "440.00",
  by_payment_method: { cash: "440.00", card: "0.00", transfer: "0.00" },
  products: [],
  categories: [],
};

interface RenderOptions {
  report?: DailyReport | null;
  cut?: CashCut | null;
  unsynced?: number;
  history?: CashCut[];
  remote?: RemoteDailyReport | null;
  remoteLoading?: boolean;
  loading?: boolean;
  saving?: boolean;
  error?: string | null;
  businessDate?: string | null;
  onSaveCash?: (opening: string, counted: string) => Promise<boolean>;
}

function renderTab(overrides: RenderOptions = {}) {
  const onSaveCash = overrides.onSaveCash ?? vi.fn(async () => true);
  const reportValue = overrides.report === undefined ? report : overrides.report;
  const remoteValue = overrides.remote === undefined ? null : overrides.remote;
  render(
    <ReportsTab
      businessDate={overrides.businessDate ?? "2026-11-22"}
      report={reportValue}
      cut={overrides.cut ?? null}
      unsynced={overrides.unsynced ?? 0}
      history={overrides.history ?? []}
      remote={remoteValue}
      remoteLoading={overrides.remoteLoading ?? false}
      loading={overrides.loading ?? false}
      saving={overrides.saving ?? false}
      error={overrides.error ?? null}
      onSaveCash={onSaveCash}
    />,
  );
  return { onSaveCash };
}

describe("ReportsTab", () => {
  it("muestra totales, tickets y métodos de pago", () => {
    renderTab();

    expect(screen.getByText("Total vendido")).toBeInTheDocument();
    expect(screen.getAllByText("$641.75").length).toBeGreaterThan(0);
    expect(screen.getByText("Tickets")).toBeInTheDocument();
    expect(screen.getByText("Promedio")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getAllByText("$440.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Tarjeta")).toBeInTheDocument();
  });

  it("calcula esperado y faltante y guarda el corte", async () => {
    const { onSaveCash } = renderTab();

    fireEvent.change(screen.getByLabelText("Fondo inicial"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("Efectivo contado"), { target: { value: "200" } });

    expect(screen.getByText("Faltante $340.00")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cerrar caja" }));

    expect(onSaveCash).toHaveBeenCalledWith("100", "200");
  });

  it("muestra el corte cerrado, avisa ventas nuevas y permite recalcular", () => {
    renderTab({ cut });

    expect(screen.getByText("Cerrado")).toBeInTheDocument();
    expect(screen.getByText("Hay ventas nuevas desde el cierre.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recalcular" })).toBeInTheDocument();
  });

  it("avisa cuántas ventas siguen sin sincronizar", () => {
    renderTab({ unsynced: 3 });

    expect(screen.getByText("3 ventas sin sincronizar.")).toBeInTheDocument();
  });

  it("muestra la conciliación y su diferencia contra el backend", () => {
    renderTab({ remote });

    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByTestId("reconciliation-difference")).toHaveTextContent("$201.75");
  });

  it("no bloquea el corte si el backend no responde", () => {
    renderTab({ remote: null, remoteLoading: false });

    expect(screen.getByText(/Sin conciliación/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeInTheDocument();
  });

  it("muestra el estado de carga", () => {
    renderTab({ report: null, loading: true });

    expect(screen.getByText("Cargando corte…")).toBeInTheDocument();
  });

  it("conserva los montos del corte al recalcular", () => {
    renderTab({ cut });

    expect(screen.getByLabelText("Fondo inicial")).toHaveValue("100.00");
    expect(screen.getByLabelText("Efectivo contado")).toHaveValue("500.00");
  });

  it("deshabilita guardar si falta el efectivo contado", () => {
    const { onSaveCash } = renderTab();

    expect(screen.getByRole("button", { name: "Cerrar caja" })).toBeDisabled();
    expect(onSaveCash).not.toHaveBeenCalled();
  });
});
