import { afterEach, describe, expect, it } from "vitest";

import {
  hasVoidPin,
  isVoidPinFormat,
  registerVoidPinFailure,
  resetVoidPinFailures,
  setVoidPin,
  verifyVoidPin,
  voidPinLocked,
} from "@/lib/voidPin";

afterEach(() => {
  localStorage.clear();
  resetVoidPinFailures();
});

describe("voidPin", () => {
  it("exige de 4 a 6 dígitos", () => {
    expect(isVoidPinFormat("1234")).toBe(true);
    expect(isVoidPinFormat("123456")).toBe(true);
    expect(isVoidPinFormat("123")).toBe(false);
    expect(isVoidPinFormat("1234567")).toBe(false);
    expect(isVoidPinFormat("12a4")).toBe(false);
  });

  it("bloquea tras cinco intentos fallidos", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(voidPinLocked()).toBe(false);
      registerVoidPinFailure();
    }
    expect(voidPinLocked()).toBe(true);
    resetVoidPinFailures();
    expect(voidPinLocked()).toBe(false);
  });

  it("guarda el hash y verifica el PIN cuando hay Web Crypto", async () => {
    if (!globalThis.crypto?.subtle) return;

    await setVoidPin("1234");

    expect(hasVoidPin()).toBe(true);
    expect(await verifyVoidPin("1234")).toBe(true);
    expect(await verifyVoidPin("4321")).toBe(false);
  });
});
