import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export { addons, dessertTypes, flavourGroups, flavours, frostings, settings, sizeMultipliers } from "./schema/catalogue";

export const jobHeartbeats = pgTable("job_heartbeats", {
  id: uuid("id").defaultRandom().primaryKey(),
  job: text("job").notNull().unique(),
  at: timestamp("at", { withTimezone: true }).notNull(),
}).enableRLS();

export const rateLimitHits = pgTable("rate_limit_hits", {
  id: uuid("id").defaultRandom().primaryKey(),
  keyHash: text("key_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("rate_limit_hits_key_hash_idx").on(table.keyHash),
  index("rate_limit_hits_expires_at_idx").on(table.expiresAt),
]).enableRLS();
