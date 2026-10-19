import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import { orders } from "../db/schema";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { clearFlagForOwner, completeOrderForOwner, flagOrderForOwner, recordBalancePaidForOwner, verifyOrderForOwner } from "./order-actions";
import { getOwnerOrderDetail } from "./orders-query";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.close())); });

describe("owner orders PGlite integration", () => {
  it("loads a deep-linked detail in every status and completes the verify, flag, and balance flows", async () => {
    const test = await createTestDb(); databases.push(test);
    const statuses = ["awaiting_quote", "awaiting_payment", "awaiting_verification", "confirmed", "completed", "expired"] as const;
    for (const [index, status] of statuses.entries()) {
      const { order } = await createOrder(test.db, orderInput({ eventDate: `2026-10-${String(20 + index).padStart(2, "0")}` }), BOOKED_AT);
      await test.db.update(orders).set({ status }).where(eq(orders.id, order.id));
      const detail = await getOwnerOrderDetail(test.db, order.reference, BOOKED_AT);
      expect(detail).toMatchObject({ id: order.id, status, summary: expect.any(String), lines: expect.any(Array), submissions: expect.any(Array), events: expect.any(Array) });
      expect(detail).not.toHaveProperty("accessTokenHash");
    }
    const lapsed = await createOrder(test.db, orderInput({ eventDate: "2026-10-28" }), BOOKED_AT);
    await test.db.update(orders).set({ status: "awaiting_payment", paymentDueAt: new Date("2026-10-18T00:00:00Z") }).where(eq(orders.id, lapsed.order.id));
    expect((await getOwnerOrderDetail(test.db, lapsed.order.reference, new Date("2026-10-19T00:00:00Z")))?.status).toBe("expired");

    const { order } = await createOrder(test.db, orderInput({ eventDate: "2026-10-30" }), BOOKED_AT);
    await test.db.update(orders).set({ status: "awaiting_verification" }).where(eq(orders.id, order.id));
    expect(await flagOrderForOwner({ db: test.db }, order.id, "Check amount")).toMatchObject({ ok: true });
    expect(await flagOrderForOwner({ db: test.db }, order.id, "   ")).toMatchObject({ ok: false, code: "ORDER_INVALID" });
    expect(await clearFlagForOwner({ db: test.db }, order.id)).toMatchObject({ ok: true });
    expect(await verifyOrderForOwner({ db: test.db, now: () => new Date("2026-10-19T12:00:00Z") }, order.id)).toMatchObject({ ok: true, order: { status: "confirmed" } });
    expect(await completeOrderForOwner({ db: test.db }, order.id)).toMatchObject({ ok: true, balanceUnpaid: true, order: { status: "completed" } });
    expect(await recordBalancePaidForOwner({ db: test.db }, order.id, { method: "cash", note: "Received" })).toMatchObject({ ok: true, order: { balanceMethod: "cash", balanceNote: "Received" } });
  });
});
