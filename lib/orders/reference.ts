import { sql } from "drizzle-orm";
import type { Db } from "../db";
import { referenceCounters } from "../db/schema";

const LUSAKA_OFFSET = 2 * 60 * 60 * 1000;

/** Takes the next `CAKE-YYYY-NNNN` number for the Lusaka year of `now`. Run it inside the order's transaction so a rollback releases the number. */
export async function allocateReference(tx: Db, now: Date): Promise<string> {
  const year = new Date(now.getTime() + LUSAKA_OFFSET).getUTCFullYear();
  const [{ lastNumber }] = await tx.insert(referenceCounters).values({ year, lastNumber: 1 })
    .onConflictDoUpdate({ target: referenceCounters.year, set: { lastNumber: sql`${referenceCounters.lastNumber} + 1` } })
    .returning({ lastNumber: referenceCounters.lastNumber });
  return `CAKE-${year}-${String(lastNumber).padStart(4, "0")}`;
}
