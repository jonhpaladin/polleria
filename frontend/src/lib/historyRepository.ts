import { sumCents } from "@/lib/money";
import type { PolleriaDb } from "@/lib/db";
import type { Cents } from "@/types/catalog";
import type { LocalTicket } from "@/types/sale";

export interface HistorySummary {
  ticketCount: number;
  activeTotalCents: Cents;
  voidedTotalCents: Cents;
  voidedCount: number;
}

/** Tickets del rango inclusivo, del día y folio más recientes al más viejo. */
export async function listTicketsBetween(
  db: PolleriaDb,
  from: string,
  to: string,
): Promise<LocalTicket[]> {
  const tickets = await db.tickets
    .where("businessDate")
    .between(from, to, true, true)
    .toArray();
  return tickets.sort(
    (left, right) =>
      right.businessDate.localeCompare(left.businessDate) ||
      right.localFolio - left.localFolio,
  );
}

/** Búsqueda amigable por folio: coincide con cualquier parte del número. */
export function filterTicketsByFolio(
  tickets: readonly LocalTicket[],
  query: string,
): LocalTicket[] {
  const text = query.trim();
  if (!text) return [...tickets];
  return tickets.filter((ticket) => String(ticket.localFolio).includes(text));
}

export function summarizeTickets(tickets: readonly LocalTicket[]): HistorySummary {
  const active = tickets.filter((ticket) => ticket.status !== "voided");
  const voided = tickets.filter((ticket) => ticket.status === "voided");
  return {
    ticketCount: tickets.length,
    activeTotalCents: sumCents(active.map((ticket) => ticket.totalCents)),
    voidedTotalCents: sumCents(voided.map((ticket) => ticket.totalCents)),
    voidedCount: voided.length,
  };
}
