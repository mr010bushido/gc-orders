import { and, eq, lte } from "drizzle-orm";
import type { Db } from "../db";
import { orders } from "../db/schema";
import { OrderError } from "../orders/orders";
import { transition } from "../orders/transitions";

export async function expireOrders(db: Db, now: Date = new Date(), applyTransition = transition) {
  const overdue = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.status, "awaiting_payment"), lte(orders.paymentDueAt, now)))
    .limit(100);
  const expired = [];
  for (const { id } of overdue) {
    try {
      expired.push(await applyTransition(db, id, "expire", "system", now));
    } catch (error) {
      if (!(error instanceof OrderError) || error.code !== "INVALID_TRANSITION") throw error;
    }
  }
  return expired;
}
