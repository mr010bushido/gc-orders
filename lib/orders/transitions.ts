import { and, eq, gt, lte, type SQL } from "drizzle-orm";
import type { Db } from "../db";
import { orders, orderStatusEvents, popSubmissions } from "../db/schema";
import type { Actor, OrderStatus } from "../db/schema/orders";
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

async function refusal(db: Db, orderId: string, action: Action, now: Date): Promise<OrderError> {
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
