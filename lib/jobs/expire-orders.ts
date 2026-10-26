import { and, eq, lte } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { orders } from "../db/schema";
import { notify } from "../notify/notify";
import { OrderError, type Order } from "../orders/orders";
import { transition } from "../orders/transitions";
import { defineJob } from "../platform/jobs";

export async function expireOrders(
  db: Db,
  now: Date = new Date(),
  applyTransition = transition,
  sendNotice: (order: Order) => Promise<void> = order => notify("order_expired", { order }),
) {
  const overdue = await db.select({ id: orders.id }).from(orders)
    .where(and(eq(orders.status, "awaiting_payment"), lte(orders.paymentDueAt, now)))
    .limit(100);
  const expired = [];
  for (const { id } of overdue) {
    try {
      const order = await applyTransition(db, id, "expire", "system", now);
      expired.push(order);
      try { await sendNotice(order); } catch { /* Notifications must not undo an expiry or stop the batch. */ }
    } catch (error) {
      if (!(error instanceof OrderError) || error.code !== "INVALID_TRANSITION") throw error;
    }
  }
  return expired;
}

defineJob("expire-orders", async () => { await expireOrders(getDb()); });
