import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { orders, orderStatusEvents } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { transition } from "../orders/transitions";
import { expireOrders } from "./expire-orders";

const now = new Date("2026-10-20T08:00:00Z");
let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); });
afterEach(async () => { await test.close(); });

async function order(dueAt = new Date(now.getTime() - 10 * 60_000)) {
  const created = await createOrder(test.db, orderInput(), BOOKED_AT);
  await test.db.update(orders).set({ paymentDueAt: dueAt }).where(eq(orders.id, created.order.id));
  return created.order.id;
}

it("expires overdue orders at their deadline, but leaves future and flagged orders alone", async () => {
  const overdue = await order();
  const future = await order(new Date(now.getTime() + 5 * 60_000));
  const flagged = await order(new Date(now.getTime() - 3 * 24 * 60 * 60_000));
  await test.db.update(orders).set({ status: "awaiting_verification", flaggedAt: now, flagNote: "Check payment" })
    .where(eq(orders.id, flagged));

  const expired = await expireOrders(test.db, now);

  expect(expired.map(({ id }) => id)).toEqual([overdue]);
  expect(await test.db.select({ id: orderStatusEvents.id, orderId: orderStatusEvents.orderId, actor: orderStatusEvents.actor })
    .from(orderStatusEvents).where(and(eq(orderStatusEvents.orderId, overdue), eq(orderStatusEvents.toStatus, "expired"))))
    .toMatchObject([{ actor: "system" }]);
  expect(await test.db.select({ id: orders.id, status: orders.status }).from(orders))
    .toEqual(expect.arrayContaining([{ id: future, status: "awaiting_payment" }, { id: flagged, status: "awaiting_verification" }]));
});

it("expires at most 100 orders per run", async () => {
  const ids = [];
  for (let i = 0; i < 150; i++) ids.push(await order());

  expect(await expireOrders(test.db, now)).toHaveLength(100);
  expect(await expireOrders(test.db, now)).toHaveLength(50);
  expect((await test.db.select().from(orders).where(eq(orders.status, "expired")))).toHaveLength(150);
});

it("returns nothing on a second run", async () => {
  await order();
  expect(await expireOrders(test.db, now)).toHaveLength(1);
  expect(await expireOrders(test.db, now)).toEqual([]);
});

it("does not expire an order if POP lands after selection", async () => {
  const id = await order();
  const applyTransition: typeof transition = async (db, orderId, action, actor, at) => {
    await db.update(orders).set({ status: "awaiting_verification" }).where(eq(orders.id, orderId));
    return transition(db, orderId, action, actor, at);
  };

  await expect(expireOrders(test.db, now, applyTransition)).resolves.toEqual([]);
  expect((await test.db.select().from(orders).where(eq(orders.id, id)))[0].status).toBe("awaiting_verification");
});
