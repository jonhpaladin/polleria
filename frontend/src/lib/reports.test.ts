import { describe, expect, it } from "vitest";

import {
  buildCashCut,
  buildDailyReport,
  formatProductQuantity,
  formatSignedCents,
  hasNewSales,
  parseCashAmount,
  reconcileReports,
} from "@/lib/reports";
import type { Cents } from "@/types/catalog";
import type { RemoteDailyReport } from "@/types/report";
import type { Grams, LocalTicket } from "@/types/sale";

const CASH_UUID = "11111111-1111-4111-8111-111111111111";
const CARD_UUID = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-22T23:00:00Z");

function cashTicket(overrides: Partial<LocalTicket> = {}): LocalTicket {
  return {
    schemaVersion: 1,
    clientOrderUuid: CASH_UUID,
    localFolio: 1,
    soldAtUtc: "2026-11-22T18:00:00Z",
    businessDate: "2026-11-22",
    paymentMethod: "cash",
    lines: [
      {
        lineId: "line-1",
        productId: "prd-pollo-asado",
        sku: "POLLO-ASADO",
        name: "Pollo asado",
        categoryName: "Pollo fresco",
        unit: "piece",
        quantity: 2,
        grams: null,
        priceSource: "lista",
        catalogUnitPriceCents: 22000 as Cents,
        unitPriceCents: 22000 as Cents,
        lineTotalCents: 44000 as Cents,
      },
    ],
    totalCents: 44000 as Cents,
    status: "confirmed",
    catalogUpdatedAt: "2026-11-11T18:04:00Z",
    ...overrides,
  };
}

function cardTicket(): LocalTicket {
  return cashTicket({
    clientOrderUuid: CARD_UUID,
    localFolio: 2,
    paymentMethod: "card",
    totalCents: 20175 as Cents,
    lines: [
      {
        lineId: "line-2",
        productId: "prd-pierna-muslo",
        sku: "PIERNA-MUSLO",
        name: "Pierna y muslo",
        categoryName: "Pollo fresco",
        unit: "kg",
        quantity: 1,
        grams: 1345 as Grams,
        priceSource: "lista",
        catalogUnitPriceCents: 15000 as Cents,
        unitPriceCents: 15000 as Cents,
        lineTotalCents: 20175 as Cents,
      },
    ],
  });
}

function remoteReport(overrides: Partial<RemoteDailyReport> = {}): RemoteDailyReport {
  return {
    business_date: "2026-11-22",
    ticket_count: 1,
    total: "440.00",
    by_payment_method: { cash: "440.00", card: "0.00", transfer: "0.00" },
    products: [],
    categories: [],
    ...overrides,
  };
}

describe("buildDailyReport", () => {
  it("suma totales, métodos, productos y categorías del día", () => {
    const report = buildDailyReport([cashTicket(), cardTicket()], "2026-11-22");

    expect(report.ticketCount).toBe(2);
    expect(report.totalCents).toBe(64175);
    expect(report.averageTicketCents).toBe(32088);
    expect(report.byPayment).toEqual({ cash: 44000, card: 20175, transfer: 0 });
    expect(report.byProduct.map((product) => product.productId)).toEqual([
      "prd-pollo-asado",
      "prd-pierna-muslo",
    ]);
    expect(report.byProduct[0]).toMatchObject({ pieces: 2, grams: 0, totalCents: 44000 });
    expect(report.byProduct[1]).toMatchObject({ pieces: 0, grams: 1345, totalCents: 20175 });
    expect(report.byCategory).toEqual([{ name: "Pollo fresco", totalCents: 64175 }]);
  });

  it("ignora tickets de otro día y devuelve ceros sin ventas", () => {
    const report = buildDailyReport(
      [cashTicket({ businessDate: "2026-11-21" })],
      "2026-11-22",
    );

    expect(report.ticketCount).toBe(0);
    expect(report.totalCents).toBe(0);
    expect(report.averageTicketCents).toBe(0);
    expect(report.byPayment).toEqual({ cash: 0, card: 0, transfer: 0 });
    expect(report.byProduct).toEqual([]);
  });

  it("excluye los tickets anulados del corte", () => {
    const report = buildDailyReport(
      [
        cashTicket(),
        cashTicket({
          clientOrderUuid: "33333333-3333-4333-8333-333333333333",
          localFolio: 3,
          status: "voided",
          voidReason: "Cobro incorrecto",
        }),
      ],
      "2026-11-22",
    );

    expect(report.ticketCount).toBe(1);
    expect(report.totalCents).toBe(44000);
    expect(report.byPayment.cash).toBe(44000);
  });
});

describe("buildCashCut", () => {
  it("calcula esperado y faltante, y conserva la fecha de cierre al recalcular", () => {
    const report = buildDailyReport([cashTicket(), cardTicket()], "2026-11-22");

    const first = buildCashCut(report, 10000 as Cents, 50000 as Cents, NOW);
    expect(first.expectedCashCents).toBe(54000);
    expect(first.differenceCents).toBe(-4000);
    expect(first.closedAtUtc).toBe("2026-11-22T23:00:00.000Z");
    expect(first.recalculatedAtUtc).toBeNull();

    const later = new Date("2026-11-22T23:30:00Z");
    const again = buildCashCut(report, 10000 as Cents, 54000 as Cents, later, first);
    expect(again.closedAtUtc).toBe(first.closedAtUtc);
    expect(again.recalculatedAtUtc).toBe("2026-11-22T23:30:00.000Z");
    expect(again.differenceCents).toBe(0);
  });

  it("detecta ventas nuevas comparando tickets y total", () => {
    const report = buildDailyReport([cashTicket()], "2026-11-22");
    const cut = buildCashCut(report, 0 as Cents, 44000 as Cents, NOW);

    expect(hasNewSales(report, cut)).toBe(false);
    expect(hasNewSales(buildDailyReport([cashTicket(), cardTicket()], "2026-11-22"), cut)).toBe(
      true,
    );
  });
});

describe("reconcileReports", () => {
  it("compara totales y métodos contra el backend", () => {
    const report = buildDailyReport([cashTicket(), cardTicket()], "2026-11-22");

    const result = reconcileReports(report, remoteReport());

    expect(result.localTotalCents).toBe(64175);
    expect(result.remoteTotalCents).toBe(44000);
    expect(result.differenceCents).toBe(20175);
    expect(result.byPayment.cash).toEqual({
      localCents: 44000,
      remoteCents: 44000,
      differenceCents: 0,
    });
    expect(result.byPayment.card).toEqual({
      localCents: 20175,
      remoteCents: 0,
      differenceCents: 20175,
    });
  });

  it("no inventa diferencias si no hay backend", () => {
    const result = reconcileReports(buildDailyReport([cashTicket()], "2026-11-22"), null);

    expect(result.remoteTotalCents).toBeNull();
    expect(result.differenceCents).toBeNull();
    expect(result.byPayment.transfer.remoteCents).toBeNull();
  });
});

describe("formatos de corte", () => {
  it("formatea diferencias con signo y cantidades por unidad", () => {
    expect(formatSignedCents(-4000)).toBe("-$40.00");
    expect(formatSignedCents(0)).toBe("$0.00");
    expect(
      formatProductQuantity({
        productId: "prd-pierna",
        sku: "PIERNA-MUSLO",
        name: "Pierna",
        unit: "kg",
        pieces: 0,
        grams: 1345,
        totalCents: 20175 as Cents,
      }),
    ).toBe("1.345 kg");
    expect(
      formatProductQuantity({
        productId: "prd-pollo",
        sku: "POLLO-ASADO",
        name: "Pollo",
        unit: "piece",
        pieces: 1,
        grams: 0,
        totalCents: 22000 as Cents,
      }),
    ).toBe("1 pza");
  });

  it("acepta montos sin decimales o con uno", () => {
    expect(parseCashAmount("100")).toBe(10000);
    expect(parseCashAmount("100.5")).toBe(10050);
    expect(parseCashAmount("100.50")).toBe(10050);
    expect(() => parseCashAmount("abc")).toThrow();
  });
});
