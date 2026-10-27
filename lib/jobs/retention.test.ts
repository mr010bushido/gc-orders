import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { notificationLog, orderImages, orders } from "../db/schema";
import { makeImageStoreFake } from "../platform/fakes";
import { createOrder } from "../orders/orders";
import { orderInput } from "../orders/fixtures";
import { runRetention } from "./retention";

it("removes expired pending uploads and anonymises due orders", async () => {
  const test = await createTestDb();
  try {
    const { store } = makeImageStoreFake();
    const now = new Date("2026-10-27T00:00:00Z");
    const old = await createOrder(test.db, orderInput({ eventDate: "2024-10-25" }), now);
    const recent = await createOrder(test.db, orderInput({ eventDate: "2025-10-27" }), now);
    await test.db.insert(orderImages).values({ key: "old-order", orderId: old.order.id, bytes: 1, width: 1, height: 1,
      tokenHash: "old-token", addressHash: "old-address", createdAt: now });
    await store.put("old-order", new Uint8Array([1]), "image/jpeg");
    await test.db.insert(orderImages).values(Array.from({ length: 201 }, (_, index) => ({ key: `pending-${index}`, bytes: 1, width: 1, height: 1,
      tokenHash: `pending-token-${index}`, addressHash: "pending-address", createdAt: new Date(now.getTime() - 25 * 3_600_000) })));
    await store.put("pending", new Uint8Array([1]), "image/jpeg");

    await runRetention(test.db, store, now);
    const [order] = await test.db.select().from(orders).where(eq(orders.id, old.order.id));
    expect(order.anonymisedAt).toEqual(now);
    expect(order.customerName).toBeNull();
    const [recentOrder] = await test.db.select().from(orders).where(eq(orders.id, recent.order.id));
    expect(recentOrder.customerName).toBe("Mwila Banda");
    expect(await test.db.select().from(orderImages)).toHaveLength(1);
  } finally { await test.close(); }
});

it("continues later steps when a storage deletion fails", async () => {
  const test = await createTestDb();
  try {
    const now = new Date("2026-10-27T00:00:00Z");
    const created = await createOrder(test.db, orderInput(), now);
    await test.db.insert(orderImages).values({ key: "failed", orderId: null, bytes: 1, width: 1, height: 1,
      tokenHash: "failed-token", addressHash: "failed-address", createdAt: new Date(now.getTime() - 25 * 3_600_000) });
    await test.db.insert(notificationLog).values({ orderId: created.order.id, event: "booking_received", channel: "sms",
      recipient: "+260***456", status: "sent", at: new Date("2024-01-01T00:00:00Z") });
    const brokenStore = { ...makeImageStoreFake().store, delete: async () => { throw new Error("storage unavailable"); } };
    await expect(runRetention(test.db, brokenStore, now)).rejects.toBeInstanceOf(AggregateError);
    expect(await test.db.select().from(notificationLog)).toEqual([]);
    expect(await test.db.select().from(orderImages)).toHaveLength(1);
  } finally { await test.close(); }
});
