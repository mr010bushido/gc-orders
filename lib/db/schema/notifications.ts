import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const NOTIFICATION_EVENTS = ["booking_received", "quote_request_received", "pop_received", "deposit_verified", "quote_ready", "order_expired",
  "owner_new_booking", "owner_new_quote_request", "owner_pop_submitted"] as const;
/** POP can be resubmitted while an order is flagged, so its messages may repeat; every other event sends once per order. */
export const REPEATABLE_EVENTS = ["pop_received", "owner_pop_submitted"] as const;
export const CHANNELS = ["sms", "email"] as const;
export const NOTIFICATION_STATUSES = ["sent", "failed", "skipped"] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type Channel = (typeof CHANNELS)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

const oneOf = (values: readonly string[]) => sql.raw(`(${values.map(value => `'${value}'`).join(", ")})`);

// Recipients are masked before they are stored; message bodies are never stored.
export const notificationLog = pgTable("notification_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  event: text("event").$type<NotificationEvent>().notNull(),
  channel: text("channel").$type<Channel>().notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").$type<NotificationStatus>().notNull(),
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  at: timestamp("at", { withTimezone: true }).notNull(),
}, (table) => [
  index("notification_log_order_id_idx").on(table.orderId),
  uniqueIndex("notification_log_once_per_order").on(table.orderId, table.event, table.channel)
    .where(sql`${table.event} not in ${oneOf(REPEATABLE_EVENTS)}`),
  check("notification_log_event", sql`${table.event} in ${oneOf(NOTIFICATION_EVENTS)}`),
  check("notification_log_channel", sql`${table.channel} in ${oneOf(CHANNELS)}`),
  check("notification_log_status", sql`${table.status} in ${oneOf(NOTIFICATION_STATUSES)}`),
]).enableRLS();
