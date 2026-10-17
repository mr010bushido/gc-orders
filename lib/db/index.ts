import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";

export type Db = PgDatabase<PgQueryResultHKT>;

let database: Db | undefined;

export function getDb(): Db {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const max = Number(process.env.DATABASE_POOL_MAX ?? 1);
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new Error("DATABASE_POOL_MAX must be a positive integer");
  }
  database = drizzle(postgres(url, { prepare: false, max }));
  return database;
}
