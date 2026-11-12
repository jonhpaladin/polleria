import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UpdateBanner } from "@/components/ui/UpdateBanner";

describe("UpdateBanner", () => {
  it("no ocupa espacio cuando no hay actualización", () => {
    const { container } = render(
      <UpdateBanner visible={false} onUpdate={vi.fn()} onDismiss={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("avisa la versión nueva y dispara actualizar o más tarde", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onDismiss = vi.fn();

    render(<UpdateBanner visible onUpdate={onUpdate} onDismiss={onDismiss} />);

    expect(
      screen.getByText("Hay una versión nueva del catálogo disponible."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    await user.click(screen.getByRole("button", { name: "Más tarde" }));

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
