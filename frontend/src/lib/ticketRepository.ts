import { getDb, type PolleriaDb } from "@/lib/db";
import { buildTicket, toTicketWire, validateTicket } from "@/lib/ticket";
import type { CartState, LocalTicket, OutboxRecord } from "@/types/sale";

export interface PersistedTicket {
  ticket: LocalTicket;
  outbox: OutboxRecord;
}

export async function persistTicket(
  cart: CartState,
  catalogUpdatedAt: string,
  now = new Date(),
  clientOrderUuid: string = crypto.randomUUID(),
  db: PolleriaDb = getDb(),
): Promise<PersistedTicket> {
  return db.transaction("rw", db.tickets, db.outbox, db.meta, async () => {
    const existing = await db.tickets.get(clientOrderUuid);
    if (existing) {
      const existingOutbox = await db.outbox.get(clientOrderUuid);
      if (!existingOutbox) throw new Error("El ticket existe sin outbox");
      return { ticket: existing, outbox: existingOutbox };
    }

    const sequence = await db.meta.get("ticket-sequence");
    const localFolio = (sequence?.value.localFolio ?? 0) + 1;
    const ticket = buildTicket({ ...cart, catalogUpdatedAt }, clientOrderUuid, localFolio, now);
    validateTicket(ticket);
    const outbox: OutboxRecord = {
      clientOrderUuid,
      schemaVersion: 1,
      status: "pending",
      enqueuedAt: now.toISOString(),
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      payload: toTicketWire(ticket),
    };

    await db.tickets.add(ticket);
    await db.outbox.add(outbox);
    await db.meta.put({ key: "ticket-sequence", value: { updatedAt: "", localFolio } });
    return { ticket, outbox };
  });
}

/** Anula un ticket completo, conserva su snapshot y saca la venta del outbox. */
export async function voidTicket(
  db: PolleriaDb,
  clientOrderUuid: string,
  reason: string,
  now = new Date(),
): Promise<LocalTicket> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    throw new Error("El motivo debe tener al menos 3 caracteres.");
  }

  return db.transaction("rw", db.tickets, db.outbox, async () => {
    const ticket = await db.tickets.get(clientOrderUuid);
    if (!ticket) throw new Error("Ticket no encontrado");
    if (ticket.status === "voided") return ticket;

    const updated: LocalTicket = {
      ...ticket,
      status: "voided",
      voidedAtUtc: now.toISOString(),
      voidReason: trimmed,
      voidPending: true,
      voidLastError: null,
    };
    await db.tickets.put(updated);
    await db.outbox.delete(clientOrderUuid);
    return updated;
  });
}
