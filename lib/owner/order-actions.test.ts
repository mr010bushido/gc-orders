import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { orders, orderStatusEvents } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { recordBalancePaidForOwner, verifyOrderForOwner } from "./order-actions";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.close())); });

describe("owner order actions", () => {
  it("compare-and-sets concurrent verification and attempts notification only for the winner", async () => {
    const test = await createTestDb(); databases.push(test);
    const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
    await test.db.update(orders).set({ status: "awaiting_verification" }).where(eq(orders.id, order.id));
    let notified = 0;
    const deps = { db: test.db, now: () => new Date("2026-10-18T00:00:00Z"), notifyVerified: async () => { notified++; throw new Error("provider unavailable"); } };
    const results = await Promise.all([verifyOrderForOwner(deps, order.id), verifyOrderForOwner(deps, order.id)]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(results.filter(result => !result.ok)).toMatchObject([{ code: "INVALID_TRANSITION", message: "This order changed. Refresh and try again." }]);
    expect(notified).toBe(1);
    expect(await test.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, order.id))).toHaveLength(2);
  });

  it("returns clear action errors instead of throwing and strips the token hash", async () => {
    const test = await createTestDb(); databases.push(test);
    const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
    const result = await verifyOrderForOwner({ db: test.db }, order.id);
    expect(result).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
    const paid = await recordBalancePaidForOwner({ db: test.db }, order.id, { method: "cash" });
    expect(paid).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
  });
});
