import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { notificationLog, orderImages, orders, popSubmissions, quoteRequests } from "../db/schema";
import { makeImageStoreFake } from "../platform/fakes";
import { anonymiseOrder } from "./anonymise";
import { createOrder } from "./orders";
import { orderInput } from "./fixtures";

it("anonymises once, removes personal records and images, and preserves order totals", async () => {
  const test = await createTestDb();
  try {
    const { store } = makeImageStoreFake();
    const created = await createOrder(test.db, orderInput(), new Date("2026-10-17T08:00:00Z"));
    const id = created.order.id;
    await test.db.insert(quoteRequests).values({ orderId: id, kind: "other", description: "A personal cake request" });
    await test.db.insert(popSubmissions).values({ orderId: id, text: "payment sms", submittedAt: new Date() });
    await test.db.insert(notificationLog).values({ orderId: id, event: "booking_received", channel: "sms",
      recipient: "+260***456", providerMessageId: "personal-provider-id", error: "personal provider error", status: "failed", at: new Date() });
    await store.put("orders/photo", new Uint8Array([1]), "image/jpeg");
    await test.db.insert(orderImages).values({ orderId: id, key: "orders/photo", bytes: 1, width: 1, height: 1,
      tokenHash: "token", addressHash: "address", createdAt: new Date() });
    const before = created.order.total;

    expect(await anonymiseOrder(test.db, store, id, new Date("2026-10-27T00:00:00Z"))).toBe(true);
    expect(await anonymiseOrder(test.db, store, id)).toBe(false);
    const [order] = await test.db.select().from(orders).where(eq(orders.id, id));
    expect(order).toMatchObject({ customerName: null, customerPhone: null, customerEmail: null, deliveryAddress: null,
      designNotes: null, topperMessage: null, flagNote: null, balanceNote: null, total: before,
      anonymisedAt: new Date("2026-10-27T00:00:00Z") });
    expect(await test.db.select().from(popSubmissions).where(eq(popSubmissions.orderId, id))).toEqual([]);
    expect(await test.db.select().from(notificationLog).where(eq(notificationLog.orderId, id))).toMatchObject([
      { recipient: "Removed", providerMessageId: null, error: null, event: "booking_received", channel: "sms", status: "failed" },
    ]);
    expect(await test.db.select().from(orderImages).where(eq(orderImages.orderId, id))).toEqual([]);
    expect((await test.db.select().from(quoteRequests).where(eq(quoteRequests.orderId, id)))[0].description).toBe("Customer data removed");
  } finally { await test.close(); }
});
