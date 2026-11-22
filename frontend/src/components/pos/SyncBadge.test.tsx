import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SyncBadge } from "@/components/pos/SyncBadge";

describe("SyncBadge", () => {
  it("no ocupa espacio cuando todo está sincronizado", () => {
    const { container } = render(
      <SyncBadge pending={0} failed={0} syncing={false} onRetry={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra las ventas por enviar", () => {
    render(<SyncBadge pending={3} failed={0} syncing={false} onRetry={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("3 ventas por enviar");
  });

  it("usa singular con una sola venta", () => {
    render(<SyncBadge pending={1} failed={0} syncing={false} onRetry={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("1 venta por enviar");
  });

  it("muestra el envío en curso", () => {
    render(<SyncBadge pending={2} failed={0} syncing onRetry={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando…");
  });

  it("muestra los fallidos y permite reintentarlos", async () => {
    const onRetry = vi.fn();
    render(<SyncBadge pending={0} failed={2} syncing={false} onRetry={onRetry} />);

    expect(screen.getByRole("status")).toHaveTextContent("2 ventas con error");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
