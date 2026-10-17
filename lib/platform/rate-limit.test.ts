import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { rateLimitHits } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { PostgresRateLimiter } from "./rate-limit";

let test: Awaited<ReturnType<typeof createTestDb>>;
let limiter: PostgresRateLimiter;
beforeEach(async () => {
  test = await createTestDb();
  limiter = new PostgresRateLimiter(() => test.db);
});
afterEach(async () => { await test.close(); });

it("allows five hits and denies the sixth, independently for each key", async () => {
  for (let attempt = 0; attempt < 5; attempt++) expect(await limiter.hit("login:ip", 5, 3600)).toBe(true);
  expect(await limiter.hit("login:ip", 5, 3600)).toBe(false);
  expect(await limiter.hit("login:other", 5, 3600)).toBe(true);
});

it("allows a new hit when the window expires and cleans expired keys", async () => {
  expect(await limiter.hit("expired:other", 1, 60)).toBe(true);
  expect(await limiter.hit("login:ip", 1, 60)).toBe(true);
  expect(await limiter.hit("login:ip", 1, 60)).toBe(false);
  await test.db.update(rateLimitHits).set({ expiresAt: sql`clock_timestamp() - interval '1 second'` });
  expect(await limiter.hit("login:ip", 1, 60)).toBe(true);
  expect(await test.db.select().from(rateLimitHits)).toHaveLength(1);
});

it("stores only the SHA-256 hash and persists limits across limiter instances", async () => {
  const key = "booking:+260971234567";
  expect(await limiter.hit(key, 1, 60)).toBe(true);
  const rows = await test.db.select().from(rateLimitHits);
  expect(rows[0].keyHash).toBe(createHash("sha256").update(key).digest("hex"));
  expect(JSON.stringify(rows)).not.toContain("260971234567");
  expect(await new PostgresRateLimiter(() => test.db).hit(key, 1, 60)).toBe(false);
});

it("does not oversubscribe a key under concurrent hits", async () => {
  const results = await Promise.all(Array.from({ length: 10 }, () => limiter.hit("login:ip", 3, 60)));
  expect(results.filter(Boolean)).toHaveLength(3);
  expect(await test.db.select().from(rateLimitHits)).toHaveLength(3);
});

it("rejects invalid input before asking for a database", async () => {
  const unavailable = new PostgresRateLimiter(() => { throw new Error("should not connect"); });
  for (const [key, limit, window] of [["", 1, 1], ["key", 0, 1], ["key", 1, 0], ["key", 1.5, 1], ["key", 1, Infinity]] as const) {
    await expect(unavailable.hit(key, limit, window)).rejects.toThrow("Rate limit requires");
  }
});
 
