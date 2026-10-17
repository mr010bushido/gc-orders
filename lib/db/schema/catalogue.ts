import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const flavourGroups = pgTable("flavour_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  basePrice: integer("base_price").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [check("flavour_groups_positive_price", sql`${table.basePrice} > 0`)]).enableRLS();

export const flavours = pgTable("flavours", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  groupId: uuid("group_id").notNull().references(() => flavourGroups.id),
  diet: text("diet").$type<"standard" | "vegan" | "diabetic">().notNull().default("standard"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [check("flavours_diet", sql`${table.diet} in ('standard', 'vegan', 'diabetic')`)]).enableRLS();

export const frostings = pgTable("frostings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}).enableRLS();

export const sizeMultipliers = pgTable("size_multipliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  size: integer("size").notNull().unique(),
  multiplier: integer("multiplier").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  check("size_multipliers_positive_size", sql`${table.size} > 0`),
  check("size_multipliers_positive_multiplier", sql`${table.multiplier} > 0`),
]).enableRLS();

export const addons = pgTable("addons", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [check("addons_nonnegative_price", sql`${table.price} >= 0`)]).enableRLS();

export const dessertTypes = pgTable("dessert_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  flavourSuggestions: text("flavour_suggestions").array().notNull().default(sql`'{}'::text[]`),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [check("dessert_types_positive_price", sql`${table.price} > 0`)]).enableRLS();

export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
