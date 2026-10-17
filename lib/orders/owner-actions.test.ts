import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { orders, orderStatusEvents } from "../db/schema";
import type { OrderStatus } from "../db/schema/orders";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder } from "./orders";
import { balanceDue, clearFlag, complete, markBalancePaid, markSeen, setFlag, submitPop, transition } from "./transitions";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const at = (hours: number) => new Date(BOOKED_AT.getTime() + hours * 3600_000);

async function orderIn(status: OrderStatus) {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await test.db.update(orders).set({ status }).where(eq(orders.id, order.id));
  return order.id;
}

it("flags without changing the status, and clears the flag keeping the note", async () => {
  const id = await orderIn("awaiting_payment");
  await submitPop(test.db, id, "Airtel K520 sent, TID 123", at(1));
  expect(await setFlag(test.db, id, " Amount does not match ", at(2))).toMatchObject({ status: "awaiting_verification", flaggedAt: at(2), flagNote: "Amount does not match" });
  expect(await clearFlag(test.db, id, at(3))).toMatchObject({ status: "awaiting_verification", flaggedAt: null, flagNote: "Amount does not match" });
  await expect(clearFlag(test.db, id, at(4))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  expect(await test.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, id))).toHaveLength(2);
});

it.each<OrderStatus>(["awaiting_quote", "awaiting_payment", "confirmed", "completed", "expired"])("refuses to flag a %s order", async (status) => {
  await expect(setFlag(test.db, await orderIn(status), "Check this", at(1))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
});

it("needs a note to flag", async () => {
  await expect(setFlag(test.db, await orderIn("awaiting_verification"), "  ", at(1))).rejects.toMatchObject({ code: "ORDER_INVALID" });
});

it("clears the flag on verify and keeps the note", async () => {
  const id = await orderIn("awaiting_verification");
  await setFlag(test.db, id, "Name differs", at(1));
  expect(await transition(test.db, id, "verify", "owner", at(2))).toMatchObject({ status: "confirmed", flaggedAt: null, flagNote: "Name differs" });
});

it("records the balance once and shows nothing due", async () => {
  const id = await orderIn("confirmed");
  const paid = await markBalancePaid(test.db, id, { method: "cash", note: "Paid at pickup" }, at(1));
  expect(paid).toMatchObject({ balancePaidAt: at(1), balanceMethod: "cash", balanceNote: "Paid at pickup" });
  expect(balanceDue(paid)).toBe(0);
  await expect(markBalancePaid(test.db, id, { method: "mtn" }, at(2))).rejects.toMatchObject({ code: "BALANCE_ALREADY_PAID" });
});

it("records the balance on a completed order but not before confirmation", async () => {
  await expect(markBalancePaid(test.db, await orderIn("completed"), { method: "airtel" }, at(1))).resolves.toMatchObject({ balanceNote: null });
  await expect(markBalancePaid(test.db, await orderIn("awaiting_verification"), { method: "cash" }, at(1))).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  await expect(markBalancePaid(test.db, await orderIn("confirmed"), { method: "cheque" as never }, at(1))).rejects.toMatchObject({ code: "ORDER_INVALID" });
});

it("completes with the balance unpaid and reports it", async () => {
  const id = await orderIn("confirmed");
  const unpaid = await complete(test.db, id, at(1));
  expect(unpaid).toMatchObject({ order: { status: "completed" }, balanceUnpaid: true });
  expect(balanceDue(unpaid.order)).toBe(520);
  const paidId = await orderIn("confirmed");
  await markBalancePaid(test.db, paidId, { method: "bank" }, at(1));
  expect(await complete(test.db, paidId, at(2))).toMatchObject({ balanceUnpaid: false });
});

it("marks seen once", async () => {
  const id = await orderIn("awaiting_payment");
  expect(await markSeen(test.db, id, at(1))).toMatchObject({ ownerSeenAt: at(1) });
  expect(await markSeen(test.db, id, at(2))).toMatchObject({ ownerSeenAt: at(1) });
  await expect(markSeen(test.db, "00000000-0000-0000-0000-000000000000", at(1))).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" });
});
