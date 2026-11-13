import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WeightControls } from "@/components/pos/WeightControls";
import type { Grams } from "@/types/sale";

describe("WeightControls", () => {
  it("deshabilita restar en 250 g y sumar en 20,000 g", () => {
    const onChange = vi.fn();
    const { rerender } = render(<WeightControls grams={250 as Grams} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Disminuir 250 gramos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Aumentar 250 gramos" })).toBeEnabled();

    rerender(<WeightControls grams={20000 as Grams} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Aumentar 250 gramos" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disminuir 250 gramos" })).toBeEnabled();
  });

  it("ofrece los cuatro atajos y emite gramos enteros", () => {
    const onChange = vi.fn();
    render(<WeightControls grams={1000 as Grams} onChange={onChange} />);

    for (const label of ["0.500 kg", "1.000 kg", "1.500 kg", "2.000 kg"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "2.000 kg" }));

    expect(onChange).toHaveBeenCalledWith(2000);
  });
});
