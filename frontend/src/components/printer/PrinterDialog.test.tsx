import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PrinterBadge, PrinterDialog } from "@/components/printer/PrinterDialog";
import type { UsePrinterResult } from "@/hooks/usePrinter";
import type { PrinterState } from "@/types/print";

function state(overrides: Partial<PrinterState> = {}): PrinterState {
  return {
    status: "disconnected",
    connectionType: null,
    deviceName: null,
    supportedBle: false,
    supportedUsb: false,
    pending: 0,
    failed: 0,
    uncertain: 0,
    message: null,
    codepage: "auto",
    ...overrides,
  };
}

function printer(overrides: Partial<UsePrinterResult> = {}): UsePrinterResult {
  return {
    state: state(),
    connect: vi.fn(),
    reconnect: vi.fn().mockResolvedValue(false),
    disconnect: vi.fn(),
    printTicket: vi.fn(),
    printTest: vi.fn(),
    printWithSystem: vi.fn(),
    printTicketWithSystem: vi.fn(),
    retryFailed: vi.fn(),
    retryUncertain: vi.fn(),
    discard: vi.fn(),
    listAttentionJobs: vi.fn().mockResolvedValue([]),
    setCodepage: vi.fn(),
    ...overrides,
  };
}

describe("PrinterDialog", () => {
  it("explica el fallback cuando no hay Web Bluetooth ni WebUSB", async () => {
    const listAttentionJobs = vi.fn().mockResolvedValue([]);
    render(
      <PrinterDialog
        printer={printer({ listAttentionJobs })}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Este navegador no soporta impresión directa/),
    ).toBeInTheDocument();
    await waitFor(() => expect(listAttentionJobs).toHaveBeenCalled());
  });

  it("muestra el conteo de pendientes en el badge y abre el diálogo", async () => {
    const listAttentionJobs = vi.fn().mockResolvedValue([]);
    render(
      <PrinterBadge
        printer={printer({
          state: state({ pending: 2, failed: 1 }),
          listAttentionJobs,
        })}
      />,
    );

    const badge = screen.getByRole("button", { name: /Impresora: Sin impresora, 3 pendientes/ });
    expect(badge).toHaveTextContent("3");

    fireEvent.click(badge);

    expect(screen.getByRole("dialog", { name: "Impresora" })).toBeInTheDocument();
    await waitFor(() => expect(listAttentionJobs).toHaveBeenCalled());
  });
});
