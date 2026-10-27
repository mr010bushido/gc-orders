import { and, eq, isNull, lt, lte } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { notificationLog, orderImages, orders } from "../db/schema";
import { todayInLusaka } from "../availability/availability";
import { anonymiseOrder } from "../orders/anonymise";
import { IMAGE_RETENTION_DAYS, NOTIFICATION_RETENTION_YEARS, ORDER_RETENTION_YEARS, PENDING_UPLOAD_RETENTION_HOURS, RETENTION_BATCH_SIZE, lusakaDateAfterDays, lusakaDateAfterYears } from "../retention/constants";
import { imageStore } from "../platform/image-store-select";
import type { ImageStore } from "../platform/image-store";
import { defineJob } from "../platform/jobs";

export async function runRetention(db: Db, store: ImageStore, now = new Date()) {
  const failures: unknown[] = [];
  const step = async (run: () => Promise<void>) => { try { await run(); } catch (error) { failures.push(error); } };

  await step(async () => {
    const cutoff = new Date(now.getTime() - PENDING_UPLOAD_RETENTION_HOURS * 3_600_000);
    const rows = await db.select({ id: orderImages.id, key: orderImages.key }).from(orderImages)
      .where(and(isNull(orderImages.orderId), lt(orderImages.createdAt, cutoff))).limit(RETENTION_BATCH_SIZE);
    for (const row of rows) { await store.delete(row.key); await db.delete(orderImages).where(eq(orderImages.id, row.id)); }
  });
  await step(async () => {
    const cutoffDate = lusakaDateAfterDays(todayInLusaka(now), -IMAGE_RETENTION_DAYS - 1);
    const rows = await db.select({ id: orderImages.id, key: orderImages.key }).from(orderImages)
      .innerJoin(orders, eq(orderImages.orderId, orders.id))
      .where(lte(orders.eventDate, cutoffDate)).limit(RETENTION_BATCH_SIZE);
    for (const row of rows) { await store.delete(row.key); await db.delete(orderImages).where(eq(orderImages.id, row.id)); }
  });
  await step(async () => {
    const cutoffDate = lusakaDateAfterYears(todayInLusaka(now), -ORDER_RETENTION_YEARS);
    const rows = await db.select({ id: orders.id }).from(orders)
      .where(and(isNull(orders.anonymisedAt), lt(orders.eventDate, cutoffDate))).limit(RETENTION_BATCH_SIZE);
    for (const row of rows) await anonymiseOrder(db, store, row.id, now);
  });
  await step(async () => {
    const cutoff = new Date(now);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - NOTIFICATION_RETENTION_YEARS);
    const rows = await db.select({ id: notificationLog.id }).from(notificationLog).where(lt(notificationLog.at, cutoff))
      .limit(RETENTION_BATCH_SIZE);
    for (const row of rows) await db.delete(notificationLog).where(eq(notificationLog.id, row.id));
  });
  if (failures.length) throw new AggregateError(failures, "One or more retention steps failed");
}

defineJob("retention", async () => runRetention(getDb(), imageStore()));
