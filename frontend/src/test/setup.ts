import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// El encoder importa @canvas/image-data en Node; jsdom no trae ImageData.
if (typeof globalThis.ImageData === "undefined") {
  class ImageDataPolyfill {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }
  Object.defineProperty(globalThis, "ImageData", { value: ImageDataPolyfill });
}

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
