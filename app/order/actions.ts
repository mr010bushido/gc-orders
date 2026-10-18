"use server";

import { after } from "next/server";
import { getDb } from "@/lib/db";
import { effectiveStatus, findOrderByToken, OrderError, type OrderDetail } from "@/lib/orders/orders";
import { submitPop } from "@/lib/orders/transitions";
import { notify } from "@/lib/notify/notify";

export type PopActionResult = { ok: true; status: "awaiting_verification" } | { ok: false; error: string };

export async function submitPopAction(token: string, text: string): Promise<PopActionResult> {
  const db = getDb();
  const detail = await findOrderByToken(db, token);
  if (!detail) return { ok: false, error: "We couldn't submit those payment details. Reload your private order link and try again." };
  try {
    const now = new Date();
    if (effectiveStatus(detail.order, now) !== "awaiting_payment" && !(detail.order.status === "awaiting_verification" && detail.order.flaggedAt)) {
      throw new OrderError(detail.order.paymentDueAt && detail.order.paymentDueAt <= now ? "ORDER_EXPIRED" : "INVALID_TRANSITION");
    }
    await submitPop(db, detail.order.id, text, now);
    const updated = await findOrderByToken(db, token) as OrderDetail;
    after(async () => {
      // `notify` is designed never to throw; keep that guarantee at this boundary too.
      await Promise.allSettled([
        notify("pop_received", { order: updated.order }, { db }),
        notify("owner_pop_submitted", { order: updated.order }, { db }),
      ]);
    });
    return { ok: true, status: "awaiting_verification" };
  } catch (error) {
    const code = error instanceof OrderError ? error.code : "ORDER_INVALID";
    const message = code === "POP_TEXT_INVALID" ? "Paste the full confirmation SMS (at least 10 characters)."
      : code === "ORDER_EXPIRED" ? "This booking has expired. Please book again to choose a new date."
      : code === "INVALID_TRANSITION" ? "Payment details cannot be changed for this booking."
      : "We couldn't submit those payment details. Try again.";
    return { ok: false, error: message };
  }
}
