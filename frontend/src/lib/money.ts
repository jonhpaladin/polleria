import type { Cents } from "@/types/catalog";

export type MoneyErrorCode = "INVALID_FORMAT" | "INVALID_CENTS";

export class MoneyError extends Error {
  readonly code: MoneyErrorCode;

  constructor(code: MoneyErrorCode, message: string) {
    super(message);
    this.name = "MoneyError";
    this.code = code;
  }
}

const MONEY_PATTERN = /^(\d{1,8})\.(\d{2})$/;
const groupFormatter = new Intl.NumberFormat("es-MX");

/** Convierte "185.10" a 18510 sin pasar el decimal completo por `Number`. */
export function parseMoneyToCents(raw: string): Cents {
  const match = MONEY_PATTERN.exec(raw);
  if (!match) {
    throw new MoneyError("INVALID_FORMAT", `Dinero inválido: "${raw}"`);
  }
  const pesos = Number(match[1]);
  const centsPart = Number(match[2]);
  return assertCents(pesos * 100 + centsPart);
}

/** Verifica que un número sea una cantidad entera de centavos válida. */
export function assertCents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError("INVALID_CENTS", `Centavos inválidos: ${value}`);
  }
  return value as Cents;
}

/** Formatea centavos como "$1,234.50" usando solo enteros para el dinero. */
export function formatCents(cents: Cents): string {
  const value = assertCents(cents);
  const digits = String(value).padStart(3, "0");
  const pesos = Number(digits.slice(0, -2));
  const centsPart = Number(digits.slice(-2));
  return `$${groupFormatter.format(pesos)}.${String(centsPart).padStart(2, "0")}`;
}

/** Suma centavos con verificación de enteros. Reservada para el carrito de 002. */
export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const value of values) {
    total += assertCents(value);
  }
  return assertCents(total);
}
