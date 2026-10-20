import { afterAll, beforeAll, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDate } from "../availability/availability";
import { orders } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { countOrdersForDate, getOwnerAvailability } from "./availability-query";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

it("adds awaiting counts to suggestions and returns closed dates with reason and note", async () => {
  for (let i = 0; i < 10; i++) {
    const { order } = await createOrder(test.db, orderInput({ eventDate: "2027-01-14" }), BOOKED_AT);
    await test.db.update(orders).set({ status: "confirmed", paymentDueAt: null }).where(eq(orders.id, order.id));
  }
  for (let i = 0; i < 3; i++) await createOrder(test.db, orderInput({ eventDate: "2027-01-14" }), BOOKED_AT);
  const { order: expiredOrder } = await createOrder(test.db, orderInput({ eventDate: "2027-01-14" }), BOOKED_AT);
  await test.db.update(orders).set({ status: "expired", paymentDueAt: null }).where(eq(orders.id, expiredOrder.id));
  await closeDate(test.db, "2027-02-25", "manual", "Christmas", BOOKED_AT);

  const result = await getOwnerAvailability(test.db, "2026-10-18");
  expect(result.suggestions).toContainEqual({ date: "2027-01-14", confirmedCount: 10, capacity: 10, awaitingCount: 3 });
  expect(result.closedDates).toContainEqual({ date: "2027-02-25", reason: "manual", note: "Christmas" });
  expect(await countOrdersForDate(test.db, "2027-01-14")).toBe(13);
});
