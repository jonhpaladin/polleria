import type { PolleriaDb } from "@/lib/db";
import type { CashCut } from "@/types/report";
import type { LocalTicket } from "@/types/sale";

export async function listTicketsByBusinessDate(
  db: PolleriaDb,
  businessDate: string,
): Promise<LocalTicket[]> {
  return db.tickets.where("businessDate").equals(businessDate).toArray();
}

export async function readCashCut(
  db: PolleriaDb,
  businessDate: string,
): Promise<CashCut | undefined> {
  return db.cashCuts.get(businessDate);
}

export async function saveCashCut(db: PolleriaDb, cut: CashCut): Promise<void> {
  await db.cashCuts.put(cut);
}

export async function listCashCuts(db: PolleriaDb, limit = 12): Promise<CashCut[]> {
  return db.cashCuts.orderBy("businessDate").reverse().limit(limit).toArray();
}

/** Tickets del día que aún no llegaron al backend (outbox o anulación pendiente). */
export async function countUnsyncedTickets(
  db: PolleriaDb,
  businessDate: string,
): Promise<number> {
  const [pending, failed, tickets] = await Promise.all([
    db.outbox.where("status").equals("pending").toArray(),
    db.outbox.where("status").equals("failed").toArray(),
    db.tickets.where("businessDate").equals(businessDate).toArray(),
  ]);
  const pendingOutbox = [...pending, ...failed].filter(
    (record) => record.payload.business_date === businessDate,
  ).length;
  const pendingVoids = tickets.filter((ticket) => ticket.voidPending === true).length;
  return pendingOutbox + pendingVoids;
}
