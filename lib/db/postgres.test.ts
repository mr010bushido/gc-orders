import { randomUUID, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { expect, it } from "vitest";
import { DatabaseHeartbeatStore } from "../platform/heartbeat";
import { PostgresRateLimiter } from "../platform/rate-limit";
import { jobHeartbeats, rateLimitHits } from "./schema";

it.skipIf(!process.env.TEST_DATABASE_URL)("Postgres 17 preserves heartbeats and migrations and serializes concurrent rate limits", async () => {
  const client = postgres(process.env.TEST_DATABASE_URL!, { prepare: false, max: 10 });
  const db = drizzle(client);
  const key = `test:${randomUUID()}`;
  const keyHash = createHash("sha256").update(key).digest("hex");
  try {
    const [version] = await client`select current_setting('server_version_num')::integer as version`;
    expect(version.version).toBeGreaterThanOrEqual(170000);
    expect(version.version).toBeLessThan(180000);
    const at = new Date("2026-01-01T00:00:00Z");
    await new DatabaseHeartbeatStore(() => db).record(key, at);
    const history = await client`select * from drizzle.__drizzle_migrations order by id`;
    await migrate(db, { migrationsFolder: "./drizzle" });
    expect(await client`select * from drizzle.__drizzle_migrations order by id`).toEqual(history);
    const restartedClient = postgres(process.env.TEST_DATABASE_URL!, { prepare: false, max: 1 });
    try {
      expect(await new DatabaseHeartbeatStore(() => drizzle(restartedClient)).last(key)).toEqual(at);
    } finally {
      await restartedClient.end();
    }
    const limiter = new PostgresRateLimiter(() => db);
    const results = await Promise.all(Array.from({ length: 20 }, () => limiter.hit(key, 3, 60)));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await db.select().from(rateLimitHits).where(eq(rateLimitHits.keyHash, keyHash))).toHaveLength(3);
  } finally {
    await db.delete(rateLimitHits).where(eq(rateLimitHits.keyHash, keyHash));
    await db.delete(jobHeartbeats).where(eq(jobHeartbeats.job, key));
    await client.end();
  }
}, 15000);
