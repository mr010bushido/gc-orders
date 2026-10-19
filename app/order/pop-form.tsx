"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitPopAction, type PopActionResult } from "./pop-action";
import { ORDER_STATUS_ID } from "./status-message";

export function PopForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PopActionResult | null, FormData>(async (previous, formData) => {
    const result = await submitPopAction(token, previous, formData);
    // On success, or when the page was stale, the server refresh removes this form in the same render as the result,
    // so an effect here would never run. Hand focus to the status message, which stays mounted.
    if (result.ok || result.stale) document.getElementById(ORDER_STATUS_ID)?.focus();
    return result;
  }, null);
  // Controlled, because React resets an uncontrolled form once its action finishes, which would wipe the pasted SMS on an error.
  const [text, setText] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state?.ok === false && !state.stale) field.current?.focus(); }, [state]);
  if (state?.ok) return <p role="status" aria-live="polite" className="rounded-md bg-ok-bg p-4 text-ok-ink">Payment details received. The owner will verify them and be in touch.</p>;
  return <form action={action} className="space-y-3">
    <label htmlFor="pop-text" className="block text-sm font-medium">Paste the full mobile money confirmation SMS</label>
    <textarea ref={field} id="pop-text" name="text" value={text} onChange={event => setText(event.target.value)} required minLength={10} maxLength={2000} rows={5} aria-invalid={state?.ok === false || undefined} aria-describedby={state?.ok === false ? "pop-error" : undefined} className="w-full rounded-sm border border-line-strong bg-surface p-3 text-base" />
    {state?.ok === false && <p id="pop-error" role="alert" className="text-sm text-err-ink">{state.error}</p>}
    <Button type="submit" block disabled={pending}>{pending ? "Sending…" : "Send payment details"}</Button>
  </form>;
}
