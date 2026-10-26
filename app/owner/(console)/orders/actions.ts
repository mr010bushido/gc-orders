"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "../../../../lib/auth/require-owner";
import { getDb } from "../../../../lib/db";
import { notify } from "../../../../lib/notify/notify";
import { clearFlagForOwner, completeOrderForOwner, flagOrderForOwner, markOrderSeenForOwner, recordBalancePaidForOwner, verifyOrderForOwner } from "../../../../lib/owner/order-actions";
import type { BalanceMethod } from "../../../../lib/db/schema/orders";
import { sendQuote, declineQuote } from "../../../../lib/quotes/quotes";
import type { Order } from "../../../../lib/orders/orders";

function withoutTokenHash(order: Order): Omit<Order, "accessTokenHash"> {
  const safeOrder = { ...order } as Partial<Order>;
  delete safeOrder.accessTokenHash;
  return safeOrder as Omit<Order, "accessTokenHash">;
}

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

export async function sendQuoteAction(id: string, lines: unknown) {
  await requireOwner();
  const db = getDb();
  try {
    const { order, token } = await sendQuote(db, id, lines, new Date());
    after(() => notify("quote_ready", { order, token }, { db }));
    revalidatePath("/owner/orders");
    return { ok: true as const, order: withoutTokenHash(order) };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "ACTION_FAILED";
    return { ok: false as const, code, message: "The quote could not be sent." };
  }
}

export async function declineQuoteAction(id: string) {
  await requireOwner();
  try {
    const order = await declineQuote(getDb(), id, new Date());
    revalidatePath("/owner/orders");
    return { ok: true as const, order: withoutTokenHash(order) };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "ACTION_FAILED";
    return { ok: false as const, code, message: "The request could not be declined." };
  }
}
