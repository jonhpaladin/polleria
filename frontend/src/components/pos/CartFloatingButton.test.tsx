import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CartFloatingButton } from "@/components/pos/CartFloatingButton";

describe("CartFloatingButton", () => {
  it("no se muestra sin líneas", () => {
    const { container } = render(<CartFloatingButton count={0} onOpen={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el contador y abre el carrito", () => {
    const onOpen = vi.fn();
    render(<CartFloatingButton count={3} onOpen={onOpen} />);

    const button = screen.getByRole("button", { name: "Abrir carrito, 3 líneas" });
    expect(button).toHaveTextContent("3");

    fireEvent.click(button);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("usa singular con una línea", () => {
    render(<CartFloatingButton count={1} onOpen={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Abrir carrito, 1 línea" })).toBeInTheDocument();
  });
});
