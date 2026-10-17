import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { orders, orderStatusEvents } from "../db/schema";
import { ORDER_STATUSES, type OrderStatus } from "../db/schema/orders";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder } from "./orders";
import { TRANSITIONS, transition, type Action } from "./transitions";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const HOUR = 3600_000;
const beforeDeadline = new Date(BOOKED_AT.getTime() + HOUR);
const afterDeadline = new Date(BOOKED_AT.getTime() + 25 * HOUR);

async function orderIn(status: OrderStatus) {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await test.db.update(orders).set({ status }).where(eq(orders.id, order.id));
  return order.id;
}
const events = (orderId: string) => test.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, orderId));

const pairs = (Object.keys(TRANSITIONS) as Action[]).flatMap(action => ORDER_STATUSES.map(from => [action, from] as const));

it.each(pairs)("%s from %s succeeds only when the table allows it", async (action, from) => {
  const id = await orderIn(from);
  const rule = TRANSITIONS[action];
  const now = action === "expire" ? afterDeadline : beforeDeadline;
  const call = transition(test.db, id, action, rule.actor, now);
  if (rule.from === from) {
    await expect(call).resolves.toMatchObject({ status: rule.to });
    expect((await events(id)).at(-1)).toMatchObject({ fromStatus: from, toStatus: rule.to, actor: rule.actor, at: now });
  } else {
    await expect(call).rejects.toMatchObject({ code: action === "submit_pop" && from === "expired" ? "ORDER_EXPIRED" : "INVALID_TRANSITION" });
    const [row] = await test.db.select().from(orders).where(eq(orders.id, id));
    expect(row.status).toBe(from);
    expect(await events(id)).toHaveLength(1);
  }
});

it("rejects an action made by the wrong actor", async () => {
  const id = await orderIn("awaiting_verification");
  await expect(transition(test.db, id, "verify", "customer", beforeDeadline)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
});

it("refuses to complete an order that is awaiting verification", async () => {
  const id = await orderIn("awaiting_verification");
  await expect(transition(test.db, id, "complete", "owner", beforeDeadline)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
});

it("lets exactly one of two concurrent verifies win", async () => {
  const id = await orderIn("awaiting_verification");
  const results = await Promise.allSettled([1, 2].map(() => transition(test.db, id, "verify", "owner", beforeDeadline)));
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "INVALID_TRANSITION" } });
  expect((await events(id)).filter(event => event.toStatus === "confirmed")).toHaveLength(1);
});

it("declines a quote request as the owner", async () => {
  const id = await orderIn("awaiting_quote");
  await expect(transition(test.db, id, "decline", "owner", beforeDeadline)).resolves.toMatchObject({ status: "expired" });
  expect((await events(id)).at(-1)).toMatchObject({ toStatus: "expired", actor: "owner" });
});

it("starts the payment clock when the quote is sent", async () => {
  const { order } = await createOrder(test.db, orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } }), BOOKED_AT);
  const sent = await transition(test.db, order.id, "send_quote", "owner", beforeDeadline);
  expect(sent.paymentDueAt).toEqual(new Date(beforeDeadline.getTime() + 24 * HOUR));
});

it("does not expire an order before its deadline, nor accept POP after it", async () => {
  const id = await orderIn("awaiting_payment");
  await expect(transition(test.db, id, "expire", "system", beforeDeadline)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  await expect(transition(test.db, id, "submit_pop", "customer", afterDeadline)).rejects.toMatchObject({ code: "ORDER_EXPIRED" });
});

it("reports a missing order", async () => {
  for (const id of ["00000000-0000-0000-0000-000000000000", "not-a-uuid"]) {
    await expect(transition(test.db, id, "verify", "owner", beforeDeadline)).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
  }
});
