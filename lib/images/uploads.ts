import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "../db";
import { orderImages } from "../db/schema";
import type { ImageStore } from "../platform/image-store";
import type { RateLimiter } from "../platform/rate-limit";
import { processImage } from "./process";

export type UploadErrorCode = "INVALID_INPUT" | "RATE_LIMITED";

export class UploadError extends Error {
  constructor(public readonly code: UploadErrorCode) {
    super(code);
    this.name = "UploadError";
  }
}

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function uploadImage(db: Db, store: ImageStore, limiter: RateLimiter, address: string, bytes: Uint8Array) {
  if (!await limiter.hit(`image-upload:${address}`, 20, 3600)) throw new UploadError("RATE_LIMITED");
  const processed = await processImage(bytes);
  const addressHash = tokenHash(address);
  const id = randomUUID();
  const key = `images/${id}.webp`;
  const token = randomBytes(16).toString("base64url");
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${addressHash}, 0))`);
    const [pending] = await tx.select({ total: count() }).from(orderImages)
      .where(and(eq(orderImages.addressHash, addressHash), isNull(orderImages.orderId)));
    if (pending.total >= 6) throw new UploadError("RATE_LIMITED");
    await store.put(key, processed.bytes, "image/webp");
    try {
      await tx.insert(orderImages).values({ id, key, bytes: processed.bytes.length, width: processed.width,
        height: processed.height, tokenHash: tokenHash(token), addressHash, createdAt: new Date() });
    } catch (error) {
      await store.delete(key);
      throw error;
    }
  });
  return { id, token };
}

export async function deletePendingImage(db: Db, store: ImageStore, id: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[A-Za-z0-9_-]{22}$/.test(token)) return false;
  return db.transaction(async tx => {
    const [image] = await tx.select().from(orderImages)
      .where(and(eq(orderImages.id, id), eq(orderImages.tokenHash, tokenHash(token)), isNull(orderImages.orderId)))
      .for("update");
    if (!image) return false;
    await store.delete(image.key);
    await tx.delete(orderImages).where(eq(orderImages.id, id));
    return true;
  });
}
