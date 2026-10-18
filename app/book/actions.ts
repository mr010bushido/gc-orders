"use server";

import { after } from "next/server";
import { getDb } from "../../lib/db";
import { findOrderByToken } from "../../lib/orders/orders";
import { notify } from "../../lib/notify/notify";
import { createBooking } from "../../lib/booking/create-booking";
import type { BookingResponse } from "../../lib/booking/schema";

export async function createBookingAction(input: unknown): Promise<BookingResponse> {
  const db = getDb();
  const result = await createBooking(db, input, new Date());
  if (!result.ok) return result;

  after(async () => {
    try {
      const detail = await findOrderByToken(db, result.accessToken);
      if (!detail) throw new Error("created order could not be read");
      await Promise.all([
        notify("booking_received", { order: detail.order, token: result.accessToken }, { db }),
        notify("owner_new_booking", { order: detail.order }, { db }),
      ]);
    } catch {
      console.error("booking notification task failed");
    }
  });

  return result;
}
