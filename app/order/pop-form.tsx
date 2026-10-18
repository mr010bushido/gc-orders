"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitPopAction, type PopActionResult } from "./pop-action";

export function PopForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PopActionResult | null, FormData>(submitPopAction.bind(null, token), null);
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (state?.ok === false) field.current?.focus(); }, [state]);
  if (state?.ok) return <p role="status" aria-live="polite" className="rounded-md bg-ok-bg p-4 text-ok-ink">Payment details received. The owner will verify them and be in touch.</p>;
  return <form action={action} className="space-y-3">
    <label htmlFor="pop-text" className="block text-sm font-medium">Paste the full mobile money confirmation SMS</label>
    <textarea ref={field} id="pop-text" name="text" required minLength={10} maxLength={2000} rows={5} aria-invalid={state?.ok === false || undefined} aria-describedby={state?.ok === false ? "pop-error" : undefined} className="w-full rounded-sm border border-line-strong bg-surface p-3 text-base" />
    {state?.ok === false && <p id="pop-error" role="alert" className="text-sm text-err-ink">{state.error}</p>}
    <button disabled={pending} className="min-h-[52px] w-full rounded-md bg-brand px-5 font-semibold text-on-brand disabled:bg-line disabled:text-disabled-ink">{pending ? "Sending…" : "Send payment details"}</button>
  </form>;
}
