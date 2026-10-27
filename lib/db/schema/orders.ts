import { sql } from "drizzle-orm";
import { check, date, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const ORDER_STATUSES = ["awaiting_quote", "awaiting_payment", "awaiting_verification", "confirmed", "completed", "expired"] as const;
export const FULFILMENTS = ["pickup", "delivery"] as const;
export const TIME_WINDOWS = ["morning", "afternoon", "evening"] as const;
export const ACTORS = ["owner", "system", "customer"] as const;
export const BALANCE_METHODS = ["airtel", "mtn", "cash", "bank", "other"] as const;
export const LINE_KINDS = ["cake", "rush", "addon", "dessert", "dessert_surcharge", "delivery", "quote"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Actor = (typeof ACTORS)[number];
export type BalanceMethod = (typeof BALANCE_METHODS)[number];
export type LineKind = (typeof LINE_KINDS)[number];

const oneOf = (values: readonly string[]) => sql.raw(`(${values.map(value => `'${value}'`).join(", ")})`);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),
  accessTokenHash: text("access_token_hash").notNull().unique(),
  status: text("status").$type<OrderStatus>().notNull(),
  fulfilment: text("fulfilment").$type<(typeof FULFILMENTS)[number]>().notNull(),
  eventDate: date("event_date").notNull(),
  timeWindow: text("time_window").$type<(typeof TIME_WINDOWS)[number]>().notNull(),
  // Personal data: null only once anonymised (see orders_personal_data). Absent optional text is stored as ''.
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  designNotes: text("design_notes"),
  topperMessage: text("topper_message"),
  total: integer("total").notNull(),
  deposit: integer("deposit").notNull(),
  paymentDueAt: timestamp("payment_due_at", { withTimezone: true }),
  flaggedAt: timestamp("flagged_at", { withTimezone: true }),
  flagNote: text("flag_note"),
  balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }),
  balanceMethod: text("balance_method").$type<BalanceMethod>(),
  balanceNote: text("balance_note"),
  ownerSeenAt: timestamp("owner_seen_at", { withTimezone: true }),
  anonymisedAt: timestamp("anonymised_at", { withTimezone: true }),
  privacyConsentAt: timestamp("privacy_consent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("orders_event_date_status_idx").on(table.eventDate, table.status),
  check("orders_status", sql`${table.status} in ${oneOf(ORDER_STATUSES)}`),
  check("orders_fulfilment", sql`${table.fulfilment} in ${oneOf(FULFILMENTS)}`),
  check("orders_time_window", sql`${table.timeWindow} in ${oneOf(TIME_WINDOWS)}`),
  check("orders_balance_method", sql`${table.balanceMethod} is null or ${table.balanceMethod} in ${oneOf(BALANCE_METHODS)}`),
  check("orders_balance_recorded", sql`(${table.balancePaidAt} is null) = (${table.balanceMethod} is null)`),
  check("orders_amounts", sql`${table.total} >= 0 and ${table.deposit} >= 0 and ${table.deposit} <= ${table.total}`),
  check("orders_payment_deadline", sql`${table.status} <> 'awaiting_payment' or ${table.paymentDueAt} is not null`),
  check("orders_flag_while_verifying", sql`${table.flaggedAt} is null or ${table.status} = 'awaiting_verification'`),
  check("orders_personal_data", sql`${table.anonymisedAt} is not null or (${table.customerName} is not null and ${table.customerPhone} is not null
    and ${table.customerEmail} is not null and ${table.deliveryAddress} is not null and ${table.designNotes} is not null and ${table.topperMessage} is not null)`),
  check("orders_phone", sql`${table.customerPhone} is null or ${table.customerPhone} ~ '^\\+260[579][0-9]{8}$'`),
  check("orders_delivery_address", sql`${table.fulfilment} <> 'delivery' or ${table.anonymisedAt} is not null or btrim(${table.deliveryAddress}) <> ''`),
]).enableRLS();

export const orderLines = pgTable("order_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  position: integer("position").notNull(),
  kind: text("kind").$type<LineKind>().notNull(),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull(),
  unitAmount: integer("unit_amount").notNull(),
  amount: integer("amount").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
}, (table) => [
  unique("order_lines_order_position").on(table.orderId, table.position),
  check("order_lines_kind", sql`${table.kind} in ${oneOf(LINE_KINDS)}`),
  check("order_lines_amounts", sql`${table.quantity} > 0 and ${table.unitAmount} >= 0 and ${table.amount} >= 0`),
]).enableRLS();

export const orderImages = pgTable("order_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id),
  key: text("key").notNull().unique(),
  bytes: integer("bytes").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  addressHash: text("address_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  deletingAt: timestamp("deleting_at", { withTimezone: true }),
}, (table) => [
  index("order_images_order_id_idx").on(table.orderId),
  index("order_images_pending_address_idx").on(table.addressHash, table.orderId),
  check("order_images_dimensions", sql`${table.bytes} > 0 and ${table.width} > 0 and ${table.height} > 0`),
]).enableRLS();

export const popSubmissions = pgTable("pop_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  text: text("text").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
}, (table) => [index("pop_submissions_order_id_idx").on(table.orderId)]).enableRLS();

export const orderStatusEvents = pgTable("order_status_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  fromStatus: text("from_status").$type<OrderStatus>(),
  toStatus: text("to_status").$type<OrderStatus>().notNull(),
  actor: text("actor").$type<Actor>().notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
}, (table) => [
  index("order_status_events_order_id_idx").on(table.orderId),
  check("order_status_events_from_status", sql`${table.fromStatus} is null or ${table.fromStatus} in ${oneOf(ORDER_STATUSES)}`),
  check("order_status_events_to_status", sql`${table.toStatus} in ${oneOf(ORDER_STATUSES)}`),
  check("order_status_events_actor", sql`${table.actor} in ${oneOf(ACTORS)}`),
]).enableRLS();

export const referenceCounters = pgTable("reference_counters", {
  id: uuid("id").defaultRandom().primaryKey(),
  year: integer("year").notNull().unique(),
  lastNumber: integer("last_number").notNull(),
}, (table) => [check("reference_counters_positive", sql`${table.lastNumber} > 0`)]).enableRLS();
