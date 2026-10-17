import { and, eq, gt, inArray, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import type { Db } from "../db";
import { orders, orderStatusEvents, popSubmissions } from "../db/schema";
import { BALANCE_METHODS, type Actor, type BalanceMethod, type OrderStatus } from "../db/schema/orders";
import { isOrderId, OrderError, paymentExpiryHours, type Order } from "./orders";

const HOUR = 60 * 60 * 1000;

/** Every legal status change. Anything else is `INVALID_TRANSITION`. */
export const TRANSITIONS = {
  send_quote: { from: "awaiting_quote", to: "awaiting_payment", actor: "owner" },
  submit_pop: { from: "awaiting_payment", to: "awaiting_verification", actor: "customer" },
  verify: { from: "awaiting_verification", to: "confirmed", actor: "owner" },
  complete: { from: "confirmed", to: "completed", actor: "owner" },
  expire: { from: "awaiting_payment", to: "expired", actor: "system" },
  decline: { from: "awaiting_quote", to: "expired", actor: "owner" },
} as const satisfies Record<string, { from: OrderStatus; to: OrderStatus; actor: Actor }>;

export type Action = keyof typeof TRANSITIONS;

/**
 * Applies `action` with a compare-and-set on the current status and writes its event in the same transaction,
 * so two concurrent calls cannot both succeed. Pass `tx` to join a caller's transaction.
 */
export async function transition(db: Db, orderId: string, action: Action, actor: Actor, now: Date): Promise<Order> {
  const rule = TRANSITIONS[action];
  if (!rule || rule.actor !== actor) throw new OrderError("INVALID_TRANSITION", `${actor} cannot ${action}`);
  if (!isOrderId(orderId)) throw new OrderError("ORDER_NOT_FOUND");
  return db.transaction(async (tx) => {
    const set: Partial<typeof orders.$inferInsert> = { status: rule.to };
    const guards: SQL[] = [];
    if (action === "send_quote") set.paymentDueAt = new Date(now.getTime() + (await paymentExpiryHours(tx)) * HOUR);
    if (action === "verify") set.flaggedAt = null;
    if (action === "submit_pop") guards.push(gt(orders.paymentDueAt, now));
    if (action === "expire") guards.push(lte(orders.paymentDueAt, now));
    const [order] = await tx.update(orders).set(set)
      .where(and(eq(orders.id, orderId), eq(orders.status, rule.from), ...guards)).returning();
    if (!order) throw await refusal(tx, orderId, action, now);
    await tx.insert(orderStatusEvents).values({ orderId, fromStatus: rule.from, toStatus: rule.to, actor, at: now });
    return order;
  });
}

async function refusal(db: Db, orderId: string, action: string, now: Date): Promise<OrderError> {
  const [current] = await db.select({ status: orders.status, paymentDueAt: orders.paymentDueAt }).from(orders).where(eq(orders.id, orderId));
  if (!current) return new OrderError("ORDER_NOT_FOUND");
  const lapsed = current.status === "expired" || (current.status === "awaiting_payment" && current.paymentDueAt! <= now);
  if (action === "submit_pop" && lapsed) return new OrderError("ORDER_EXPIRED");
  return new OrderError("INVALID_TRANSITION", `cannot ${action} an order that is ${current.status}`);
}

/**
 * Stores the customer's POP text (trimmed, 10–2,000 characters). An `awaiting_payment` order moves to `awaiting_verification`;
 * a flagged order keeps its status and gains another submission. Anything else is refused.
 */
export async function submitPop(db: Db, orderId: string, text: string, now: Date): Promise<{ order: Order; resubmitted: boolean }> {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (trimmed.length < 10 || trimmed.length > 2000) throw new OrderError("POP_TEXT_INVALID");
  if (!isOrderId(orderId)) throw new OrderError("ORDER_NOT_FOUND");
  return db.transaction(async (tx) => {
    // The row lock keeps a concurrent verify or clearFlag from slipping between this check and the insert.
    const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const resubmitted = current?.status === "awaiting_verification" && current.flaggedAt !== null;
    const order = resubmitted ? current : await transition(tx, orderId, "submit_pop", "customer", now);
    await tx.insert(popSubmissions).values({ orderId, text: trimmed, submittedAt: now });
    return { order, resubmitted };
  });
}

/** Completes a confirmed order. It succeeds with an unpaid balance and says so, so the UI can warn first. */
export async function complete(db: Db, orderId: string, now: Date): Promise<{ order: Order; balanceUnpaid: boolean }> {
  const order = await transition(db, orderId, "complete", "owner", now);
  return { order, balanceUnpaid: balanceDue(order) > 0 };
}

/** Balance still owed in whole Kwacha: total minus deposit until the owner records it paid, then 0. */
export function balanceDue(order: Pick<Order, "total" | "deposit" | "balancePaidAt">): number {
  return order.balancePaidAt ? 0 : order.total - order.deposit;
}

const flagNote = (note: string) => {
  const trimmed = typeof note === "string" ? note.trim() : "";
  if (!trimmed || trimmed.length > 1000) throw new OrderError("ORDER_INVALID", "a flag needs a note of up to 1,000 characters");
  return trimmed;
};

async function updateWhere(db: Db, orderId: string, label: string, now: Date, set: Partial<typeof orders.$inferInsert>, guard: SQL, onMiss?: (current: Order) => OrderError | undefined): Promise<Order> {
  if (!isOrderId(orderId)) throw new OrderError("ORDER_NOT_FOUND");
  const [order] = await db.update(orders).set(set).where(and(eq(orders.id, orderId), guard)).returning();
  if (order) return order;
  const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
  throw (current && onMiss?.(current)) ?? await refusal(db, orderId, label, now);
}

/** Flags an order awaiting verification with the owner's note. The status does not change. */
export async function setFlag(db: Db, orderId: string, note: string, now: Date): Promise<Order> {
  const flag = flagNote(note);
  return updateWhere(db, orderId, "flag", now, { flaggedAt: now, flagNote: flag }, eq(orders.status, "awaiting_verification"));
}

/** Clears the flag on an order awaiting verification and keeps the note. */
export async function clearFlag(db: Db, orderId: string, now: Date): Promise<Order> {
  return updateWhere(db, orderId, "clear the flag on", now, { flaggedAt: null }, and(eq(orders.status, "awaiting_verification"), isNotNull(orders.flaggedAt))!);
}

/** Records the balance as paid, once, on a confirmed or completed order. */
export async function markBalancePaid(db: Db, orderId: string, payment: { method: BalanceMethod; note?: string }, now: Date): Promise<Order> {
  const note = typeof payment?.note === "string" ? payment.note.trim() : undefined;
  if (!BALANCE_METHODS.includes(payment?.method) || (note && note.length > 1000)) throw new OrderError("ORDER_INVALID", "balance needs a known method and a note of up to 1,000 characters");
  return updateWhere(db, orderId, "record the balance of", now, { balancePaidAt: now, balanceMethod: payment.method, balanceNote: note || null },
    and(inArray(orders.status, ["confirmed", "completed"]), isNull(orders.balancePaidAt))!,
    current => current.balancePaidAt && ["confirmed", "completed"].includes(current.status) ? new OrderError("BALANCE_ALREADY_PAID") : undefined);
}

/** Records the first time the owner opened the order; later calls keep that time. */
export async function markSeen(db: Db, orderId: string, now: Date): Promise<Order> {
  if (!isOrderId(orderId)) throw new OrderError("ORDER_NOT_FOUND");
  const [order] = await db.update(orders).set({ ownerSeenAt: now }).where(and(eq(orders.id, orderId), isNull(orders.ownerSeenAt))).returning();
  if (order) return order;
  const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!current) throw new OrderError("ORDER_NOT_FOUND");
  return current;
}
