import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom no implementa el modo modal de <dialog>; se simula lo mínimo para los tests.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
}

afterEach(() => {
  cleanup();
});
