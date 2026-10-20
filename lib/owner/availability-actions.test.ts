import { afterEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { dateDecisions, orders } from "../db/schema";
import type { OrderStatus } from "../db/schema/orders";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { getCapacitySuggestions, isDateOpen } from "../availability/availability";
import { AvailabilityActionError, blockDateForOwner, closeSuggestedDateForOwner, keepDateOpenForOwner, reopenDateForOwner } from "./availability-actions";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.close())); });
const deps = (db: Awaited<ReturnType<typeof createTestDb>>["db"]) => ({ db, now: () => new Date("2026-10-18T12:00:00Z") });

async function book(db: Awaited<ReturnType<typeof createTestDb>>["db"], date: string, status: OrderStatus = "confirmed") {
  const { order } = await createOrder(db, orderInput({ eventDate: date }), BOOKED_AT);
  if (status !== "awaiting_payment") await db.update(orders).set({ status, paymentDueAt: null }).where(eq(orders.id, order.id));
}

it("closes a capacity date and keeps it out of suggestions", async () => {
  const test = await createTestDb(); databases.push(test);
  for (let i = 0; i < 10; i++) await book(test.db, "2026-11-14");
  await closeSuggestedDateForOwner(deps(test.db), "2026-11-14");
  expect(await isDateOpen(test.db, "2026-11-14")).toBe(false);
  expect((await test.db.select().from(dateDecisions).where(eq(dateDecisions.eventDate, "2026-11-14")))[0]).toMatchObject({ reason: "capacity", note: "" });
  expect((await getCapacitySuggestions(test.db, "2026-10-18")).map(row => row.date)).not.toContain("2026-11-14");
});

it("records keeping a suggestion open until another confirmed order arrives", async () => {
  const test = await createTestDb(); databases.push(test);
  for (let i = 0; i < 10; i++) await book(test.db, "2026-11-15");
  expect(await keepDateOpenForOwner(deps(test.db), "2026-11-15")).toBe(true);
  expect((await getCapacitySuggestions(test.db, "2026-10-18")).map(row => row.date)).not.toContain("2026-11-15");
  await book(test.db, "2026-11-15");
  expect((await getCapacitySuggestions(test.db, "2026-10-18")).map(row => row.date)).toContain("2026-11-15");
});

it("reopens a closed date", async () => {
  const test = await createTestDb(); databases.push(test);
  await blockDateForOwner(deps(test.db), "2026-12-25", "Christmas");
  expect(await reopenDateForOwner(deps(test.db), "2026-12-25")).toBe(true);
  expect(await isDateOpen(test.db, "2026-12-25")).toBe(true);
});

it("blocks a date with a trimmed note and reports existing orders", async () => {
  const test = await createTestDb(); databases.push(test);
  await book(test.db, "2026-12-25", "confirmed");
  await book(test.db, "2026-12-25", "awaiting_verification");
  await expect(blockDateForOwner(deps(test.db), "2026-12-25", " Christmas ")).resolves.toEqual({ existingOrderCount: 2 });
  expect(await test.db.select().from(dateDecisions).where(and(eq(dateDecisions.eventDate, "2026-12-25"), eq(dateDecisions.state, "closed")))).toMatchObject([{ reason: "manual", note: "Christmas" }]);
});

it("rejects past dates and notes longer than 200 characters", async () => {
  const test = await createTestDb(); databases.push(test);
  await expect(blockDateForOwner(deps(test.db), "2026-10-17", "")).rejects.toMatchObject<Partial<AvailabilityActionError>>({ code: "DATE_IN_PAST" });
  await expect(blockDateForOwner(deps(test.db), "2026-12-25", "x".repeat(201))).rejects.toMatchObject<Partial<AvailabilityActionError>>({ code: "NOTE_TOO_LONG" });
  await expect(blockDateForOwner(deps(test.db), "2026-02-30", "")).rejects.toMatchObject<Partial<AvailabilityActionError>>({ code: "DATE_INVALID" });
});
