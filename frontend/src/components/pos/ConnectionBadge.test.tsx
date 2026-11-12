import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionBadge } from "@/components/pos/ConnectionBadge";

describe("ConnectionBadge", () => {
  it("anuncia el estado en línea de forma accesible", () => {
    render(<ConnectionBadge online />);

    const badge = screen.getByText("En línea");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
  });

  it("cambia a 'Sin conexión' sin recargar", () => {
    const { rerender } = render(<ConnectionBadge online />);

    rerender(<ConnectionBadge online={false} />);

    expect(screen.getByText("Sin conexión")).toBeInTheDocument();
  });
});
