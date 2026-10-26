import { asc, eq } from "drizzle-orm";
import { requireOwner } from "../auth/require-owner";
import { getDb, type Db } from "../db";
import { orderImages } from "../db/schema";
import { isOrderId } from "../orders/orders";
import { imageStore } from "../platform/image-store-select";
import type { ImageStore } from "../platform/image-store";

export async function getOrderImageUrls(orderId: string, deps: {
  db?: Db;
  store?: ImageStore;
  guard?: typeof requireOwner;
} = {}): Promise<Array<{ id: string; url: string; width: number; height: number }>> {
  await (deps.guard ?? requireOwner)();
  if (!isOrderId(orderId)) return [];
  const db = deps.db ?? getDb();
  const store = deps.store ?? imageStore();
  const images = await db.select({ id: orderImages.id, key: orderImages.key, width: orderImages.width, height: orderImages.height })
    .from(orderImages).where(eq(orderImages.orderId, orderId)).orderBy(asc(orderImages.createdAt));
  return Promise.all(images.map(async image => ({ id: image.id, width: image.width, height: image.height,
    url: await store.createSignedUrl(image.key, 300) })));
}
