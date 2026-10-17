import { readdir, readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { Db } from "./index";
import { hasPlatformSchemaReference, schemaViolations } from "./schema-check";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  if (process.env.TEST_DATABASE_URL) {
    const client = postgres(process.env.TEST_DATABASE_URL, { prepare: false, max: 1 });
    db = drizzle(client);
    close = () => client.end();
  } else {
    const test = await createTestDb();
    db = test.db;
    close = test.close;
  }
});
afterAll(async () => { await close?.(); });

it("all public tables have RLS, no policies, and portable column conventions", async () => {
  expect(await schemaViolations(db)).toEqual([]);
});

it("committed migrations never reference platform schemas", async () => {
  for (const name of (await readdir("drizzle")).filter((name) => name.endsWith(".sql"))) {
    expect(hasPlatformSchemaReference(await readFile(`drizzle/${name}`, "utf8")), name).toBe(false);
  }
});

it.each(['select "auth".uid()', 'select * from "auth"."users"', 'select * from "storage" . objects', "select * from STORAGE.objects"])("detects forbidden reference %s", (migration) => {
  expect(hasPlatformSchemaReference(migration)).toBe(true);
});

it("names tables and columns that break the conventions", async () => {
  await db.transaction(async (transaction) => {
    await transaction.execute(sql`create type public.invalid_status as enum ('bad')`);
    await transaction.execute(sql`create table public.invalid_conventions (id serial primary key, at timestamp, status public.invalid_status)`);
    try {
      expect(await schemaViolations(transaction)).toEqual([
        "invalid_conventions.at: invalid column convention",
        "invalid_conventions.id: invalid column convention",
        "invalid_conventions.status: invalid column convention",
        "invalid_conventions: RLS is disabled",
      ]);
    } finally {
      await transaction.execute(sql`drop table public.invalid_conventions`);
      await transaction.execute(sql`drop type public.invalid_status`);
    }
  });
});

it("rejects policies and UUID primary keys without a database default", async () => {
  await db.transaction(async (transaction) => {
    await transaction.execute(sql`create table public.invalid_policy (id uuid primary key)`);
    await transaction.execute(sql`alter table public.invalid_policy enable row level security`);
    await transaction.execute(sql`create policy readable on public.invalid_policy for select using (true)`);
    try {
      expect(await schemaViolations(transaction)).toEqual([
        "invalid_policy.id: invalid column convention",
        "invalid_policy: policies must be absent",
      ]);
    } finally {
      await transaction.execute(sql`drop table public.invalid_policy`);
    }
  });
});
