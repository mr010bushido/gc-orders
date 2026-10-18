"use client";

import { useActionState } from "react";
import { findMyBookingAction } from "./actions";

export function FindBookingForm() {
  const [state, action, pending] = useActionState(findMyBookingAction, null);
  return <form action={action} className="space-y-5 rounded-md border border-line bg-surface p-5">
    <label className="block text-sm font-medium">Booking reference<input name="reference" required autoComplete="off" className="mt-2 h-12 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base" /></label>
    <label className="block text-sm font-medium">Mobile number<input name="phone" type="tel" autoComplete="tel" required className="mt-2 h-12 w-full rounded-sm border border-line-strong bg-surface px-3.5 text-base" /></label>
    <button disabled={pending} className="min-h-[52px] w-full rounded-md bg-brand px-5 font-semibold text-on-brand disabled:bg-line disabled:text-disabled-ink">{pending ? "Checking…" : "Send my order link"}</button>
    {state?.ok && <p role="status" aria-live="polite" className="text-sm">{state.message}</p>}
    {state?.ok === false && <p role="alert" className="text-sm text-err-ink">{state.error}</p>}
  </form>;
}
