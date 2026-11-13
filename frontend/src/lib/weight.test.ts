import { describe, expect, it } from "vitest";

import { adjustGrams, assertGrams, formatGrams, MAX_GRAMS, MIN_GRAMS } from "@/lib/weight";

describe("peso en gramos", () => {
  it("formatea gramos como kilos sin float", () => {
    expect(formatGrams(assertGrams(500))).toBe("0.500 kg");
    expect(formatGrams(assertGrams(1000))).toBe("1.000 kg");
    expect(formatGrams(assertGrams(1250))).toBe("1.250 kg");
    expect(formatGrams(assertGrams(20000))).toBe("20.000 kg");
  });

  it("rechaza pesos fuera de rango o no múltiplos de 250 g", () => {
    expect(() => assertGrams(MIN_GRAMS - 250)).toThrow("Peso inválido");
    expect(() => assertGrams(MAX_GRAMS + 250)).toThrow("Peso inválido");
    expect(() => assertGrams(1001)).toThrow("Peso inválido");
    expect(() => assertGrams(0.5)).toThrow("Peso inválido");
  });

  it("ajusta en pasos de 250 g", () => {
    expect(adjustGrams(assertGrams(1000), 1)).toBe(1250);
    expect(adjustGrams(assertGrams(1000), -1)).toBe(750);
    expect(() => adjustGrams(assertGrams(MIN_GRAMS), -1)).toThrow("Peso inválido");
  });
});
