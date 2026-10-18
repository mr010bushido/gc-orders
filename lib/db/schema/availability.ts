import { sql } from "drizzle-orm";
import { check, date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const DATE_STATES = ["closed", "open"] as const;
export const CLOSE_REASONS = ["capacity", "manual"] as const;

export type DateState = (typeof DATE_STATES)[number];
export type CloseReason = (typeof CLOSE_REASONS)[number];

const oneOf = (values: readonly string[]) => sql.raw(`(${values.map(value => `'${value}'`).join(", ")})`);

// One row per decided calendar date. `closed` blocks new bookings; `open` records that the owner kept a date open at
// `confirmedCountAtDecision` confirmed and completed orders, so it is suggested again only once that count grows.
export const dateDecisions = pgTable("date_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventDate: date("event_date").notNull().unique(),
  state: text("state").$type<DateState>().notNull(),
  reason: text("reason").$type<CloseReason>(),
  note: text("note").notNull().default(""),
  confirmedCountAtDecision: integer("confirmed_count_at_decision"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
}, (table) => [
  check("date_decisions_state", sql`${table.state} in ${oneOf(DATE_STATES)}`),
  check("date_decisions_reason", sql`${table.reason} is null or ${table.reason} in ${oneOf(CLOSE_REASONS)}`),
  check("date_decisions_shape", sql`(${table.state} = 'closed' and ${table.reason} is not null and ${table.confirmedCountAtDecision} is null)
    or (${table.state} = 'open' and ${table.reason} is null and ${table.confirmedCountAtDecision} is not null and ${table.confirmedCountAtDecision} >= 0)`),
]).enableRLS();
