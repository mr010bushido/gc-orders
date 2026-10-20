import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "../db";
import { dateDecisions, orders } from "../db/schema";
import { getCapacitySuggestions } from "../availability/availability";

const AWAITING = ["awaiting_quote", "awaiting_payment", "awaiting_verification"] as const;

/** Read the owner's capacity suggestions with waiting counts and upcoming closed dates with their reasons. */
export async function getOwnerAvailability(db: Db, today: string) {
  const [suggestions, waitingRows, closedDates] = await Promise.all([
    getCapacitySuggestions(db, today),
    db.select({ date: orders.eventDate, awaitingCount: count() }).from(orders)
      .where(and(gte(orders.eventDate, today), inArray(orders.status, AWAITING)))
      .groupBy(orders.eventDate),
    db.select({ date: dateDecisions.eventDate, reason: dateDecisions.reason, note: dateDecisions.note })
      .from(dateDecisions).where(and(eq(dateDecisions.state, "closed"), gte(dateDecisions.eventDate, today)))
      .orderBy(asc(dateDecisions.eventDate)),
  ]);
  const waitingByDate = new Map(waitingRows.map(row => [row.date, row.awaitingCount]));
  return {
    suggestions: suggestions.map(suggestion => ({ ...suggestion, awaitingCount: waitingByDate.get(suggestion.date) ?? 0 })),
    closedDates,
  };
}

/** Count all existing orders, regardless of status, for the block-date notice. */
export async function countOrdersForDate(db: Db, date: string): Promise<number> {
  const [row] = await db.select({ count: count() }).from(orders).where(eq(orders.eventDate, date));
  return row.count;
}
