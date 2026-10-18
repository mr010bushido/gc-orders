import { and, asc, between, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { dateDecisions } from "../db/schema";

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
