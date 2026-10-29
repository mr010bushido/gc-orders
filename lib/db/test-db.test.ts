import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import type { Db } from "./index";
import { createTestDb } from "./test-db";

it("creates an isolated, migrated database compatible with Db", async () => {
  const first = await createTestDb();
  const second = await createTestDb();
  try {
    const db: Db = first.db;
    await db.execute(sql`create table public.test_isolation (value text)`);
    expect((await first.client.query("select * from drizzle.__drizzle_migrations")).rows.length).toBeGreaterThan(0);
    expect((await second.client.query("select to_regclass('public.test_isolation') as table_name")).rows)
      .toEqual([{ table_name: null }]);
  } finally {
    await first.close();
    await second.close();
  }
}, 15000);
