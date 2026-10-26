import { sql } from "drizzle-orm";
import { check, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const QUOTE_KINDS = ["character_cake", "wedding_cake", "toppings", "other"] as const;

export const quoteRequests = pgTable("quote_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  kind: text("kind").$type<(typeof QUOTE_KINDS)[number]>().notNull(),
  description: text("description").notNull(),
}, table => [
  unique("quote_requests_order_id_unique").on(table.orderId),
  check("quote_requests_kind", sql`${table.kind} in (${sql.raw(QUOTE_KINDS.map(kind => `'${kind}'`).join(", "))})`),
  check("quote_requests_description", sql`char_length(${table.description}) between 10 and 2000`),
]).enableRLS();
