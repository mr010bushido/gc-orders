"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { notify } from "../../../../lib/notify/notify";
import { clearFlagForOwner, completeOrderForOwner, flagOrderForOwner, markOrderSeenForOwner, recordBalancePaidForOwner, verifyOrderForOwner } from "../../../../lib/owner/order-actions";
import type { BalanceMethod } from "../../../../lib/db/schema/orders";

export async function verifyOrder(id: string) {
  await requireOwner();
  const result = await verifyOrderForOwner({ db: getDb(), notifyVerified: order => after(() => notify("deposit_verified", { order })) }, id);
  if (result.ok) revalidatePath("/owner/orders");
  return result;
}

export async function flagOrder(id: string, note: string) {
  await requireOwner();
  const result = await flagOrderForOwner({ db: getDb() }, id, note);
  if (result.ok) revalidatePath("/owner/orders");
  return result;
}

export async function clearFlag(id: string) {
  await requireOwner();
  const result = await clearFlagForOwner({ db: getDb() }, id);
  if (result.ok) revalidatePath("/owner/orders");
  return result;
}

export async function completeOrder(id: string) {
  await requireOwner();
  const result = await completeOrderForOwner({ db: getDb() }, id);
  if (result.ok) revalidatePath("/owner/orders");
  return result;
}

export async function recordBalancePaid(id: string, method: BalanceMethod, note: string) {
  await requireOwner();
  const result = await recordBalancePaidForOwner({ db: getDb() }, id, { method, note });
  if (result.ok) revalidatePath("/owner/orders");
  return result;
}

export async function markSeen(id: string) {
  await requireOwner();
  return markOrderSeenForOwner({ db: getDb() }, id);
}
