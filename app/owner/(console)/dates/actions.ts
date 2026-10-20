"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { AvailabilityActionError, blockDateForOwner, closeSuggestedDateForOwner, keepDateOpenForOwner, reopenDateForOwner } from "../../../../lib/owner/availability-actions";

type Result = { ok: true; existingOrderCount?: number } | { ok: false; code: string };

async function run(action: () => Promise<void | boolean | { existingOrderCount: number }>): Promise<Result> {
  try {
    const value = await action();
    if (value === false) return { ok: false, code: "DATE_STATE_CHANGED" };
    revalidatePath("/owner/dates");
    return { ok: true, ...(value && typeof value === "object" ? value : {}) };
  } catch (error) {
    return { ok: false, code: error instanceof AvailabilityActionError ? error.code : "ACTION_FAILED" };
  }
}

export async function closeSuggestedDate(date: string): Promise<Result> {
  await requireOwner();
  return run(() => closeSuggestedDateForOwner({ db: getDb() }, date));
}

export async function keepDateOpen(date: string): Promise<Result> {
  await requireOwner();
  return run(() => keepDateOpenForOwner({ db: getDb() }, date));
}

export async function reopenDate(date: string): Promise<Result> {
  await requireOwner();
  return run(() => reopenDateForOwner({ db: getDb() }, date));
}

export async function blockDate(date: string, note: string): Promise<Result> {
  await requireOwner();
  return run(() => blockDateForOwner({ db: getDb() }, date, note));
}
