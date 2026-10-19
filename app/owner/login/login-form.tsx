"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendOwnerLoginLink } from "./actions";

export type LoginState = "initial" | "sent" | "rate-limited" | "not-configured";

// One message for "sent" and "rate-limited" on purpose: nothing on this page may tell a stranger anything about the owner's email.
export const SENT_MESSAGE = "If that’s the owner’s email, a link is on its way. Check your inbox.";
export const LINK_ERROR_MESSAGE = "That sign-in link is invalid or has expired. Request a new link to continue.";
export const NOT_CONFIGURED_MESSAGE = "Owner login is not configured. Please contact the site administrator.";

export function LoginForm({ configured, linkError }: { configured: boolean; linkError: boolean }) {
  const [result, action, pending] = useActionState(
    async (_previous: LoginState, formData: FormData): Promise<LoginState> => (await sendOwnerLoginLink(formData)).state,
    "initial" as LoginState,
  );
  const messageRef = useRef<HTMLParagraphElement>(null);
  const state: LoginState = configured ? result : "not-configured";
  const alert = state === "not-configured" ? NOT_CONFIGURED_MESSAGE : state === "initial" && linkError ? LINK_ERROR_MESSAGE : null;
  const message = alert ?? (state === "sent" || state === "rate-limited" ? SENT_MESSAGE : null);

  // Move focus to whichever message just appeared so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  return <div className="w-full max-w-md">
    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">Giuseppe’s Cakes</p>
    <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.02em] text-ink">Owner sign in</h1>
    <p className="mt-3 leading-6 text-ink-soft">Sign in to manage cake orders.</p>

    {message ? <p
      ref={messageRef}
      tabIndex={-1}
      role={alert ? "alert" : "status"}
      className={`mt-8 rounded-md border p-4 leading-6 outline-none ${alert ? "border-err-ink bg-err-bg text-err-ink" : "border-line-strong bg-surface text-ink"}`}
    >{message}</p> : null}

    {state === "initial" ? <form action={action} className="mt-8 space-y-5">
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        helper="We’ll email a secure sign-in link."
      />
      <Button type="submit" block disabled={pending}>{pending ? "Sending link…" : "Send me a link"}</Button>
    </form> : null}

    {state === "sent" || state === "rate-limited" ? <div className="mt-5">
      <Button variant="ghost" href="/owner/login">Back to sign in</Button>
    </div> : null}
  </div>;
}
