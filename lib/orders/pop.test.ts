import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { orders, popSubmissions } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder, getOrder } from "./orders";
import { submitPop, transition } from "./transitions";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const at = (hours: number) => new Date(BOOKED_AT.getTime() + hours * 3600_000);
const SMS = "  Airtel Money: You have sent K520 to 0776597882. Ref CAKE-2026-0001. TID 123ABC  ";
const newOrder = async () => (await createOrder(test.db, orderInput(), BOOKED_AT)).order.id;
const pops = (orderId: string) => test.db.select().from(popSubmissions).where(eq(popSubmissions.orderId, orderId));

it("stores trimmed text and moves the order to awaiting_verification", async () => {
  const id = await newOrder();
  const result = await submitPop(test.db, id, SMS, at(1));
  expect(result).toMatchObject({ order: { status: "awaiting_verification" }, resubmitted: false });
  expect(await pops(id)).toMatchObject([{ text: SMS.trim(), submittedAt: at(1) }]);
});

it.each([["too short", "1234"], ["blank", "            "], ["too long", "x".repeat(2001)]])("rejects %s text and leaves the status", async (_name, text) => {
  const id = await newOrder();
  await expect(submitPop(test.db, id, text, at(1))).rejects.toMatchObject({ code: "POP_TEXT_INVALID" });
  expect((await getOrder(test.db, id))?.order.status).toBe("awaiting_payment");
  expect(await pops(id)).toEqual([]);
});

it("accepts 10 and 2,000 characters", async () => {
  await expect(submitPop(test.db, await newOrder(), "0123456789", at(1))).resolves.toBeDefined();
  await expect(submitPop(test.db, await newOrder(), "x".repeat(2000), at(1))).resolves.toBeDefined();
});

it("keeps every submission while flagged and returns the latest as current", async () => {
  const id = await newOrder();
  await submitPop(test.db, id, "first message text", at(1));
  await test.db.update(orders).set({ flaggedAt: at(2), flagNote: "Amount does not match" }).where(eq(orders.id, id));
  const result = await submitPop(test.db, id, "second message text", at(3));
  expect(result).toMatchObject({ order: { status: "awaiting_verification" }, resubmitted: true });
  expect(await pops(id)).toHaveLength(2);
  expect((await getOrder(test.db, id))?.currentPop).toEqual({ text: "second message text", submittedAt: at(3) });
});

it("refuses a second POP when the order is not flagged", async () => {
  const id = await newOrder();
  await submitPop(test.db, id, "first message text", at(1));
  await expect(submitPop(test.db, id, "second message text", at(2))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  expect(await pops(id)).toHaveLength(1);
});

it("refuses POP for an expired order or one past its deadline", async () => {
  const lapsed = await newOrder();
  await expect(submitPop(test.db, lapsed, SMS, at(25))).rejects.toMatchObject({ code: "ORDER_EXPIRED" });
  const expired = await newOrder();
  await transition(test.db, expired, "expire", "system", at(25));
  await expect(submitPop(test.db, expired, SMS, at(1))).rejects.toMatchObject({ code: "ORDER_EXPIRED" });
  expect([...await pops(lapsed), ...await pops(expired)]).toEqual([]);
});
