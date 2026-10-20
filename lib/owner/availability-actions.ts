import { z } from "zod";
import type { Db } from "../db";
import { closeDate, closeDateIfOpen, keepOpen, openDate, todayInLusaka } from "../availability/availability";
import { countOrdersForDate } from "./availability-query";

const DATE = z.iso.date();
const MAX_NOTE_LENGTH = 200;

export type AvailabilityActionErrorCode = "DATE_INVALID" | "DATE_IN_PAST" | "NOTE_TOO_LONG";
export class AvailabilityActionError extends Error {
  constructor(public readonly code: AvailabilityActionErrorCode) {
    super(code);
    this.name = "AvailabilityActionError";
  }
}

export type AvailabilityActionDeps = { db: Db; now?: () => Date };

function validateDate(date: string, now: Date) {
  if (!DATE.safeParse(date).success) throw new AvailabilityActionError("DATE_INVALID");
  const today = todayInLusaka(now);
  if (date < today) throw new AvailabilityActionError("DATE_IN_PAST");
}

export async function closeSuggestedDateForOwner({ db, now = () => new Date() }: AvailabilityActionDeps, date: string) {
  const instant = now();
  validateDate(date, instant);
  return closeDateIfOpen(db, date, "capacity", "", instant);
}

export async function keepDateOpenForOwner({ db, now = () => new Date() }: AvailabilityActionDeps, date: string) {
  const instant = now();
  validateDate(date, instant);
  return keepOpen(db, date, instant);
}

export async function reopenDateForOwner({ db, now = () => new Date() }: AvailabilityActionDeps, date: string) {
  validateDate(date, now());
  return openDate(db, date);
}

export async function blockDateForOwner({ db, now = () => new Date() }: AvailabilityActionDeps, date: string, note: string) {
  const instant = now();
  validateDate(date, instant);
  if (typeof note !== "string" || note.length > MAX_NOTE_LENGTH) throw new AvailabilityActionError("NOTE_TOO_LONG");
  const existingOrderCount = await countOrdersForDate(db, date);
  await closeDate(db, date, "manual", note, instant);
  return { existingOrderCount };
}
