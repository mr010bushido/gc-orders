import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { dateDecisions, orders, settings } from "../db/schema";
import type { OrderStatus } from "../db/schema/orders";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { getCapacitySuggestions, getClosedDates, isDateOpen } from "./availability";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const decidedAt = new Date("2026-10-17T08:00:00Z");
const TODAY = "2026-10-18";

/** Stores `n` orders for `eventDate` and forces their status; the lifecycle itself is tested elsewhere. */
async function book(eventDate: string, status: OrderStatus, n = 1) {
  for (let i = 0; i < n; i++) {
    const { order } = await createOrder(test.db, orderInput({ eventDate }), BOOKED_AT);
    if (status !== "awaiting_payment") await test.db.update(orders).set({ status, paymentDueAt: null }).where(eq(orders.id, order.id));
  }
}

it("closes a manually blocked date and lists it in range", async () => {
  await test.db.insert(dateDecisions).values({ eventDate: "2026-12-25", state: "closed", reason: "manual", note: "Christmas", decidedAt });
  expect(await isDateOpen(test.db, "2026-12-25")).toBe(false);
  expect(await isDateOpen(test.db, "2026-12-26")).toBe(true);
  expect(await getClosedDates(test.db, "2026-12-01", "2026-12-31")).toEqual(["2026-12-25"]);
});

it("lists only closed dates inside the inclusive range, in order", async () => {
  await test.db.insert(dateDecisions).values([
    { eventDate: "2027-01-03", state: "closed", reason: "capacity", decidedAt },
    { eventDate: "2027-01-01", state: "closed", reason: "manual", decidedAt },
    { eventDate: "2027-01-02", state: "open", confirmedCountAtDecision: 10, decidedAt },
    { eventDate: "2027-01-04", state: "closed", reason: "manual", decidedAt },
  ]);
  expect(await getClosedDates(test.db, "2027-01-01", "2027-01-03")).toEqual(["2027-01-01", "2027-01-03"]);
  expect(await isDateOpen(test.db, "2027-01-02")).toBe(true);
});

it("rejects malformed dates", async () => {
  await expect(isDateOpen(test.db, "25/12/2026")).rejects.toThrow(RangeError);
  await expect(getClosedDates(test.db, "2026-12-01", "tomorrow")).rejects.toThrow(RangeError);
});

it("refuses rows that break the decision shape", async () => {
  await expect(test.db.insert(dateDecisions).values({ eventDate: "2027-02-01", state: "closed", decidedAt })).rejects.toThrow();
  await expect(test.db.insert(dateDecisions).values({ eventDate: "2027-02-02", state: "open", decidedAt })).rejects.toThrow();
});

it("suggests a date at ten confirmed orders and leaves it open to bookings", async () => {
  await book("2026-11-14", "confirmed", 10);
  expect(await getCapacitySuggestions(test.db, TODAY)).toEqual([{ date: "2026-11-14", confirmedCount: 10, capacity: 10 }]);
  expect(await isDateOpen(test.db, "2026-11-14")).toBe(true);
});

it("does not count unverified orders, but counts completed ones", async () => {
  await book("2026-11-20", "confirmed", 9);
  await book("2026-11-20", "awaiting_verification", 5);
  await book("2026-11-20", "awaiting_payment", 2);
  await book("2026-11-20", "expired", 2);
  expect((await getCapacitySuggestions(test.db, TODAY)).map(s => s.date)).not.toContain("2026-11-20");
  await book("2026-11-20", "completed");
  expect((await getCapacitySuggestions(test.db, TODAY)).map(s => s.date)).toContain("2026-11-20");
});

it("uses the capacity setting", async () => {
  await book("2026-12-05", "confirmed", 6);
  expect((await getCapacitySuggestions(test.db, TODAY)).map(s => s.date)).not.toContain("2026-12-05");
  await test.db.insert(settings).values({ key: "capacity_per_day", value: 6 });
  expect(await getCapacitySuggestions(test.db, TODAY)).toContainEqual({ date: "2026-12-05", confirmedCount: 6, capacity: 6 });
  await test.db.delete(settings).where(eq(settings.key, "capacity_per_day"));
});

it("ignores past dates and never suggests a closed date", async () => {
  await book("2026-10-01", "confirmed", 10);
  await book("2026-10-18", "confirmed", 10);
  await book("2026-11-25", "confirmed", 10);
  await test.db.insert(dateDecisions).values({ eventDate: "2026-11-25", state: "closed", reason: "capacity", decidedAt });
  const dates = (await getCapacitySuggestions(test.db, TODAY)).map(s => s.date);
  expect(dates).toContain("2026-10-18");
  expect(dates).not.toContain("2026-10-01");
  expect(dates).not.toContain("2026-11-25");
});

it("suggests a kept-open date again only when its count grows", async () => {
  await book("2027-03-01", "confirmed", 10);
  await test.db.insert(dateDecisions).values({ eventDate: "2027-03-01", state: "open", confirmedCountAtDecision: 10, decidedAt });
  expect((await getCapacitySuggestions(test.db, TODAY)).map(s => s.date)).not.toContain("2027-03-01");
  await book("2027-03-01", "confirmed");
  expect(await getCapacitySuggestions(test.db, TODAY)).toContainEqual({ date: "2027-03-01", confirmedCount: 11, capacity: 10 });
});
