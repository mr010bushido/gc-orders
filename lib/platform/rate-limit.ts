import { createHash } from "node:crypto";
import { and, count, eq, gt, lte, sql } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { rateLimitHits } from "../db/schema";

export interface RateLimiter {
  hit(key: string, limit: number, windowSeconds: number): Promise<boolean>;
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(private readonly database: () => Db = getDb) {}

  async hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (typeof key !== "string" || !key || !Number.isSafeInteger(limit) || limit < 1
      || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1) {
      throw new Error("Rate limit requires a nonempty key and positive integer limit and windowSeconds");
    }
    const keyHash = createHash("sha256").update(key).digest("hex");
    return this.database().transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${keyHash}, 0))`);
      await transaction.delete(rateLimitHits).where(lte(rateLimitHits.expiresAt, sql`clock_timestamp()`));
      const [hits] = await transaction.select({ total: count() }).from(rateLimitHits)
        .where(and(eq(rateLimitHits.keyHash, keyHash), gt(rateLimitHits.expiresAt, sql`clock_timestamp()`)));
      if (hits.total >= limit) return false;
      await transaction.insert(rateLimitHits).values({
        keyHash,
        expiresAt: sql`clock_timestamp() + ${windowSeconds} * interval '1 second'`,
      });
      return true;
    });
  }
}

export const rateLimiter: RateLimiter = new PostgresRateLimiter();
