import { assertCents, formatCents, parseMoneyToCents, sumCents } from "@/lib/money";
import type { Cents } from "@/types/catalog";
import type {
  CashCut,
  CategoryTotal,
  DailyReport,
  PaymentTotals,
  ProductTotal,
  Reconciliation,
  ReconciliationPayment,
  RemoteDailyReport,
} from "@/types/report";
import type { LocalTicket, PaymentMethod } from "@/types/sale";

const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "card", "transfer"];

function emptyPayments(): PaymentTotals {
  return { cash: 0 as Cents, card: 0 as Cents, transfer: 0 as Cents };
}

/** Reporte del día de negocio calculado solo con tickets locales. */
export function buildDailyReport(
  tickets: readonly LocalTicket[],
  businessDate: string,
): DailyReport {
  const dayTickets = tickets.filter(
    (ticket) => ticket.businessDate === businessDate && ticket.status !== "voided",
  );
  const byPayment = emptyPayments();
  const products = new Map<string, ProductTotal>();
  const categories = new Map<string, Cents>();

  for (const ticket of dayTickets) {
    byPayment[ticket.paymentMethod] = assertCents(
      byPayment[ticket.paymentMethod] + ticket.totalCents,
    );
    for (const line of ticket.lines) {
      const current = products.get(line.productId) ?? {
        productId: line.productId,
        sku: line.sku,
        name: line.name,
        unit: line.unit,
        pieces: 0,
        grams: 0,
        totalCents: 0 as Cents,
      };
      if (line.unit === "kg") current.grams += line.grams ?? 0;
      else current.pieces += line.quantity;
      current.totalCents = assertCents(current.totalCents + line.lineTotalCents);
      products.set(line.productId, current);

      categories.set(
        line.categoryName,
        assertCents((categories.get(line.categoryName) ?? 0) + line.lineTotalCents),
      );
    }
  }

  const ticketCount = dayTickets.length;
  const totalCents = sumCents(dayTickets.map((ticket) => ticket.totalCents));
  const averageTicketCents =
    ticketCount === 0
      ? (0 as Cents)
      : (Math.floor((totalCents + Math.floor(ticketCount / 2)) / ticketCount) as Cents);

  return {
    businessDate,
    ticketCount,
    totalCents,
    averageTicketCents,
    byPayment,
    byProduct: [...products.values()].sort((left, right) => right.totalCents - left.totalCents),
    byCategory: [...categories.entries()]
      .map(([name, value]): CategoryTotal => ({ name, totalCents: value }))
      .sort((left, right) => right.totalCents - left.totalCents),
  };
}

/** Foto del corte. Si ya existía, conserva la fecha de cierre y marca el recálculo. */
export function buildCashCut(
  report: DailyReport,
  openingCashCents: Cents,
  countedCashCents: Cents,
  now: Date,
  previous?: CashCut,
): CashCut {
  const expectedCashCents = assertCents(openingCashCents + report.byPayment.cash);
  return {
    businessDate: report.businessDate,
    openingCashCents,
    countedCashCents,
    expectedCashCents,
    differenceCents: countedCashCents - expectedCashCents,
    ticketCount: report.ticketCount,
    totalCents: report.totalCents,
    byPayment: report.byPayment,
    closedAtUtc: previous?.closedAtUtc ?? now.toISOString(),
    recalculatedAtUtc: previous ? now.toISOString() : null,
  };
}

export function hasNewSales(report: DailyReport, cut: CashCut | null): boolean {
  if (cut === null) return false;
  return report.ticketCount !== cut.ticketCount || report.totalCents !== cut.totalCents;
}

export function reconcileReports(
  local: DailyReport,
  remote: RemoteDailyReport | null,
): Reconciliation {
  const byPayment = {} as Record<PaymentMethod, ReconciliationPayment>;
  for (const method of PAYMENT_METHODS) {
    const localCents = local.byPayment[method];
    const remoteCents = remote
      ? parseMoneyToCents(remote.by_payment_method[method] ?? "0.00")
      : null;
    byPayment[method] = {
      localCents,
      remoteCents,
      differenceCents: remoteCents === null ? null : localCents - remoteCents,
    };
  }
  const remoteTotalCents = remote ? parseMoneyToCents(remote.total) : null;
  return {
    localTotalCents: local.totalCents,
    remoteTotalCents,
    differenceCents: remoteTotalCents === null ? null : local.totalCents - remoteTotalCents,
    byPayment,
  };
}

/** Acepta «100», «100.5» y «100.50»; el estado siempre termina en centavos. */
export function parseCashAmount(value: string): Cents {
  const trimmed = value.trim();
  const normalized = /^\d+$/.test(trimmed)
    ? `${trimmed}.00`
    : /^\d+\.\d$/.test(trimmed)
      ? `${trimmed}0`
      : trimmed;
  return parseMoneyToCents(normalized);
}

/** Formatea centavos con signo; la diferencia de caja puede ser negativa. */
export function formatSignedCents(value: number): string {
  return value < 0 ? `-${formatCents(assertCents(-value))}` : formatCents(assertCents(value));
}

/** Los totales del reporte pueden tener cualquier gramaje; no pasan por el paso de 250 g. */
function formatReportGrams(grams: number): string {
  const kilos = Math.trunc(grams / 1000);
  const remainder = String(Math.abs(grams % 1000)).padStart(3, "0");
  return `${kilos}.${remainder} kg`;
}

export function formatProductQuantity(product: ProductTotal): string {
  if (product.unit === "kg") return formatReportGrams(product.grams);
  return `${product.pieces} pza${product.pieces === 1 ? "" : "s"}`;
}
