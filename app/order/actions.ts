"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { getDb } from "@/lib/db";
import { effectiveStatus, findOrderByToken, OrderError } from "@/lib/orders/orders";
import { submitPop } from "@/lib/orders/transitions";
import { notify } from "@/lib/notify/notify";
import { findMyBooking } from "@/lib/orders/access";
import { headers } from "next/headers";
import { clientAddress } from "@/lib/platform/client-address";
import type { OrderStatus } from "@/lib/db/schema/orders";

export type PopActionResult = { ok: true; status: "awaiting_verification" } | { ok: false; error: string };

const REFUSALS: Partial<Record<OrderStatus, string>> = {
  expired: "This booking has expired. Please book again to choose a new date.",
  awaiting_verification: "We already have your payment details. The owner is verifying them.",
  awaiting_quote: "This booking is waiting for a quote, so there is nothing to pay yet.",
  confirmed: "This booking is already confirmed, so no more payment details are needed.",
  completed: "This order is complete, so no more payment details are needed.",
};
const GENERIC_REFUSAL = "Payment details cannot be changed for this booking.";

export async function submitPopAction(token: string, text: string): Promise<PopActionResult> {
  const db = getDb();
  const detail = await findOrderByToken(db, token);
  if (!detail) return { ok: false, error: "We couldn't submit those payment details. Reload your private order link and try again." };
  const now = new Date();
  const status = effectiveStatus(detail.order, now);
  if (status !== "awaiting_payment" && !(status === "awaiting_verification" && detail.order.flaggedAt)) {
    // The page the customer is looking at is stale; refresh so the form disappears.
    refresh();
    return { ok: false, error: REFUSALS[status] ?? GENERIC_REFUSAL };
  }
  try {
    const { order } = await submitPop(db, detail.order.id, text, now);
    after(async () => {
      // `notify` is designed never to throw; keep that guarantee at this boundary too.
      await Promise.allSettled([
        notify("pop_received", { order }, { db }),
        notify("owner_pop_submitted", { order }, { db }),
      ]);
    });
    refresh();
    return { ok: true, status: "awaiting_verification" };
  } catch (error) {
    const code = error instanceof OrderError ? error.code : "ORDER_INVALID";
    if (code === "POP_TEXT_INVALID") return { ok: false, error: "Paste the full confirmation SMS (at least 10 characters)." };
    // The status changed between the check and the write (for example the deadline passed).
    if (code === "ORDER_EXPIRED" || code === "INVALID_TRANSITION") {
      refresh();
      return { ok: false, error: code === "ORDER_EXPIRED" ? REFUSALS.expired! : GENERIC_REFUSAL };
    }
    return { ok: false, error: "We couldn't submit those payment details. Try again." };
  }
}

export async function findMyBookingAction(_previous: { ok: boolean; message?: string; error?: string } | null, formData: FormData) {
  const requestHeaders = await headers();
  const result = await findMyBooking(String(formData.get("reference") ?? ""), String(formData.get("phone") ?? ""), { clientAddress: clientAddress(requestHeaders), schedule: after });
  if (!result.ok) return { ok: false, error: "Too many attempts. Please try again later." };
  return { ok: true, message: result.message };
}
