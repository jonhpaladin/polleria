import { describe, expect, it } from "vitest";

import { assertCents, formatCents, MoneyError, parseMoneyToCents, sumCents } from "@/lib/money";

describe("parseMoneyToCents", () => {
  it("convierte '185.10' a 18510 centavos", () => {
    expect(parseMoneyToCents("185.10")).toBe(18510);
  });

  it("acepta cero", () => {
    expect(parseMoneyToCents("0.00")).toBe(0);
  });

  it("acepta el máximo de 8 dígitos enteros", () => {
    expect(parseMoneyToCents("99999999.99")).toBe(9999999999);
  });

  it.each(["185", "185.1", "1.234", "-5.00", "1,000.00", "", " 185.00", "123456789.00"])(
    "rechaza %s",
    (raw) => {
      expect(() => parseMoneyToCents(raw)).toThrow(MoneyError);
    },
  );
});

describe("formatCents", () => {
  it("formatea 18510 como $185.10", () => {
    expect(formatCents(assertCents(18510))).toBe("$185.10");
  });

  it("agrupa los miles sin pasar por punto flotante en pesos", () => {
    expect(formatCents(assertCents(123456789))).toBe("$1,234,567.89");
  });

  it("formatea cero", () => {
    expect(formatCents(assertCents(0))).toBe("$0.00");
  });

  it("rellena centavos sueltos", () => {
    expect(formatCents(assertCents(5))).toBe("$0.05");
  });
});

describe("assertCents", () => {
  it("acepta enteros no negativos", () => {
    expect(assertCents(0)).toBe(0);
    expect(assertCents(18510)).toBe(18510);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53])(
    "rechaza %s",
    (value) => {
      expect(() => assertCents(value)).toThrow(MoneyError);
    },
  );
});

describe("sumCents", () => {
  it("suma centavos enteros", () => {
    expect(sumCents([assertCents(15000), assertCents(29900)])).toBe(44900);
  });

  it("suma vacío como cero", () => {
    expect(sumCents([])).toBe(0);
  });
});
