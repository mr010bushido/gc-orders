import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { orderImages, orders } from "../db/schema";
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
    await test.db.insert(orderImages).values({ key: "old-order", orderId: old.order.id, bytes: 1, width: 1, height: 1,
      tokenHash: "old-token", addressHash: "old-address", createdAt: now });
    await store.put("old-order", new Uint8Array([1]), "image/jpeg");
    await test.db.insert(orderImages).values({ key: "pending", bytes: 1, width: 1, height: 1,
      tokenHash: "pending-token", addressHash: "pending-address", createdAt: new Date(now.getTime() - 25 * 3_600_000) });
    await store.put("pending", new Uint8Array([1]), "image/jpeg");

    await runRetention(test.db, store, now);
    const [order] = await test.db.select().from(orders).where(eq(orders.id, old.order.id));
    expect(order.anonymisedAt).toEqual(now);
    expect(order.customerName).toBeNull();
    expect(await test.db.select().from(orderImages)).toEqual([]);
  } finally { await test.close(); }
});
