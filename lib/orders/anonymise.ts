import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../db";
import { orderImages, orders, popSubmissions, quoteRequests } from "../db/schema";
import type { ImageStore } from "../platform/image-store";

export async function anonymiseOrder(db: Db, store: ImageStore, orderId: string, now = new Date()): Promise<boolean> {
  const images = await db.select({ id: orderImages.id, key: orderImages.key }).from(orderImages)
    .where(eq(orderImages.orderId, orderId));
  for (const image of images) {
    await store.delete(image.key);
    await db.delete(orderImages).where(eq(orderImages.id, image.id));
  }
  return db.transaction(async tx => {
    const changed = await tx.update(orders).set({ customerName: null, customerPhone: null, customerEmail: null,
      deliveryAddress: null, designNotes: null, topperMessage: null, flagNote: null, balanceNote: null, anonymisedAt: now })
      .where(and(eq(orders.id, orderId), isNull(orders.anonymisedAt))).returning({ id: orders.id });
    if (!changed.length) return false;
    await tx.delete(popSubmissions).where(eq(popSubmissions.orderId, orderId));
    await tx.update(quoteRequests).set({ description: "Customer data removed" }).where(eq(quoteRequests.orderId, orderId));
    return true;
  });
}
