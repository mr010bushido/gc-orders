import { and, asc, between, count, eq, gt, gte, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { resolveSettings } from "../catalogue/settings";
import { dateDecisions, orders, settings } from "../db/schema";
import type { CloseReason } from "../db/schema/availability";

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

/**
 * Closes `date` to new bookings, replacing any kept-open override. Existing orders keep their status and date.
 * The owner confirming a suggestion passes `capacity`; a holiday block passes `manual`.
 */
export async function closeDate(db: Db, date: string, reason: CloseReason, note: string, now: Date): Promise<void> {
  const row = { state: "closed", reason, note: note.trim(), confirmedCountAtDecision: null, decidedAt: now } as const;
  await db.insert(dateDecisions).values({ eventDate: checkDate(date), ...row })
    .onConflictDoUpdate({ target: dateDecisions.eventDate, set: row });
}

/** Reopens a closed date by removing its row. Returns false if it was not closed. */
export async function openDate(db: Db, date: string): Promise<boolean> {
  const removed = await db.delete(dateDecisions)
    .where(and(eq(dateDecisions.eventDate, checkDate(date)), eq(dateDecisions.state, "closed")))
    .returning({ id: dateDecisions.id });
  return removed.length > 0;
}

/**
 * Overrides a capacity suggestion: records `date` as kept open at its current confirmed count, so it is suggested
 * again only when that count grows. Returns false, changing nothing, if the date is closed (use `openDate` first).
 */
export async function keepOpen(db: Db, date: string, now: Date): Promise<boolean> {
  const [{ confirmedCount }] = await db.select({ confirmedCount: count() }).from(orders)
    .where(and(eq(orders.eventDate, checkDate(date)), inArray(orders.status, COUNTED)));
  const recorded = await db.insert(dateDecisions)
    .values({ eventDate: date, state: "open", confirmedCountAtDecision: confirmedCount, decidedAt: now })
    .onConflictDoUpdate({
      target: dateDecisions.eventDate,
      set: { confirmedCountAtDecision: confirmedCount, decidedAt: now },
      setWhere: eq(dateDecisions.state, "open"),
    })
    .returning({ id: dateDecisions.id });
  return recorded.length > 0;
}

/**
 * Re-check for the booking transaction: pass its `tx` so the answer is read inside it. Throws `DATE_UNAVAILABLE` for a
 * closed date, so a date closed after the customer opened the form never becomes a silent booking.
 */
export async function assertDateOpen(tx: Db, date: string): Promise<void> {
  if (!(await isDateOpen(tx, date))) throw new AvailabilityError("DATE_UNAVAILABLE", `${date} is closed to new bookings`);
}
