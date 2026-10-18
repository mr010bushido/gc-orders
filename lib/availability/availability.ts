import { and, asc, between, count, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { resolveSettings } from "../catalogue/settings";
import { dateDecisions, orders, settings } from "../db/schema";

export type AvailabilityErrorCode = "DATE_UNAVAILABLE";

export class AvailabilityError extends Error {
  constructor(public readonly code: AvailabilityErrorCode, message: string = code) {
    super(message);
    this.name = "AvailabilityError";
  }
}

const calendarDate = z.iso.date();

function checkDate(date: string): string {
  if (!calendarDate.safeParse(date).success) throw new RangeError(`${date} is not a YYYY-MM-DD date`);
  return date;
}

/** Closed dates from `from` to `to` inclusive, as ascending `YYYY-MM-DD` strings. */
export async function getClosedDates(db: Db, from: string, to: string): Promise<string[]> {
  const rows = await db.select({ date: dateDecisions.eventDate }).from(dateDecisions)
    .where(and(eq(dateDecisions.state, "closed"), between(dateDecisions.eventDate, checkDate(from), checkDate(to))))
    .orderBy(asc(dateDecisions.eventDate));
  return rows.map(row => row.date);
}

/** True unless the owner has closed `date`. Capacity alone never closes a date. */
export async function isDateOpen(db: Db, date: string): Promise<boolean> {
  const rows = await db.select({ id: dateDecisions.id }).from(dateDecisions)
    .where(and(eq(dateDecisions.eventDate, checkDate(date)), eq(dateDecisions.state, "closed"))).limit(1);
  return rows.length === 0;
}

// Unverified and unpaid orders never count: only a date the owner has actually confirmed work for can fill up.
const COUNTED = ["confirmed", "completed"] as const;

export type CapacitySuggestion = { date: string; confirmedCount: number; capacity: number };

async function capacityPerDay(db: Db): Promise<number> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings).where(eq(settings.key, "capacity_per_day"));
  return resolveSettings(rows).capacity_per_day;
}

/**
 * Dates from `today` on whose confirmed and completed orders have reached the capacity setting and that the owner has
 * not closed. A date kept open is suggested again only once its count exceeds the count recorded at that decision.
 * Computed on read, never stored.
 */
export async function getCapacitySuggestions(db: Db, today: string): Promise<CapacitySuggestion[]> {
  const capacity = await capacityPerDay(db);
  const confirmedCount = count();
  const rows = await db.select({ date: orders.eventDate, confirmedCount }).from(orders)
    .leftJoin(dateDecisions, eq(dateDecisions.eventDate, orders.eventDate))
    .where(and(inArray(orders.status, COUNTED), gte(orders.eventDate, checkDate(today))))
    .groupBy(orders.eventDate, dateDecisions.state, dateDecisions.confirmedCountAtDecision)
    .having(and(
      gte(confirmedCount, capacity),
      or(isNull(dateDecisions.state), and(eq(dateDecisions.state, "open"), gt(confirmedCount, dateDecisions.confirmedCountAtDecision))),
    ))
    .orderBy(asc(orders.eventDate));
  return rows.map(row => ({ ...row, capacity }));
}
