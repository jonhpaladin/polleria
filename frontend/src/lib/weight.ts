import type { Grams } from "@/types/sale";

export const MIN_GRAMS = 250;
export const MAX_GRAMS = 20_000;
export const GRAM_STEP = 250;
export const WEIGHT_SHORTCUTS = [500, 1000, 1500, 2000] as const;

export function assertGrams(value: number): Grams {
  if (!Number.isSafeInteger(value) || value < MIN_GRAMS || value > MAX_GRAMS || value % GRAM_STEP !== 0) {
    throw new Error(`Peso inválido: ${value} gramos`);
  }
  return value as Grams;
}

export function formatGrams(grams: Grams): string {
  const value = assertGrams(grams);
  const digits = String(value).padStart(4, "0");
  return `${digits.slice(0, -3)}.${digits.slice(-3)} kg`;
}

export function adjustGrams(grams: Grams, delta: -1 | 1): Grams {
  return assertGrams(grams + delta * GRAM_STEP);
}
