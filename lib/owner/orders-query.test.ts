import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import { orders } from "../db/schema";
import { createOrder } from "../orders/orders";
import { orderInput, BOOKED_AT } from "../orders/fixtures";
import { listOwnerOrders } from "./orders-query";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.close())); });

async function add(db: Awaited<ReturnType<typeof createTestDb>>["db"], date: string, due: Date) {
  const result = await createOrder(db, orderInput({ eventDate: date, basket: { ...orderInput().basket }, }), BOOKED_AT);
  await db.update(orders).set({ paymentDueAt: due }).where(eq(orders.id, result.order.id));
  return result.order;
}

describe("listOwnerOrders", () => {
  it("uses effective status for lapsed rows and keeps date filters across statuses", async () => {
    const test = await createTestDb(); databases.push(test);
    const lapsed = await add(test.db, "2026-10-22", new Date("2026-10-18T00:00:00Z"));
    const active = await add(test.db, "2026-10-25", new Date("2026-10-25T00:00:00Z"));
    const now = new Date("2026-10-19T00:00:00Z");
    expect((await listOwnerOrders(test.db, { now })).orders.map(row => row.id)).toEqual([active.id]);
    expect((await listOwnerOrders(test.db, { status: "expired", now })).orders[0]).toMatchObject({ id: lapsed.id, status: "expired" });
    expect((await listOwnerOrders(test.db, { date: "2026-10-22", now })).orders[0].status).toBe("expired");
  });

  it("paginates in stable date order and never returns token hashes", async () => {
    const test = await createTestDb(); databases.push(test);
    const first = await add(test.db, "2026-10-22", new Date("2026-11-01T00:00:00Z"));
    const second = await add(test.db, "2026-10-25", new Date("2026-11-01T00:00:00Z"));
    const a = await listOwnerOrders(test.db, { status: "all", limit: 1, now: new Date("2026-10-19T00:00:00Z") });
    expect(a.orders[0].id).toBe(first.id);
    expect(a.nextCursor).toBeTruthy();
    expect(a.orders[0]).not.toHaveProperty("accessTokenHash");
    const b = await listOwnerOrders(test.db, { status: "all", limit: 1, cursor: a.nextCursor!, now: new Date("2026-10-19T00:00:00Z") });
    expect(b.orders[0].id).toBe(second.id);
  });
});
