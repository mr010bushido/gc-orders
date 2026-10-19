"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { findMyBookingAction } from "./actions";

export function FindBookingForm() {
  const [state, action, pending] = useActionState(findMyBookingAction, null);
  return <form action={action} className="space-y-5 rounded-md border border-line bg-surface p-5">
    {/* The only refusal is a rate limit on the reference, so the error belongs to that field. */}
    <Input label="Booking reference" name="reference" required autoComplete="off" error={state?.ok === false ? state.error : undefined} />
    <Input label="Mobile number" name="phone" type="tel" autoComplete="tel" required />
    <Button type="submit" block disabled={pending}>{pending ? "Checking…" : "Send my order link"}</Button>
    {state?.ok && <p role="status" aria-live="polite" className="text-sm">{state.message}</p>}
  </form>;
}
