import { randomUUID } from "node:crypto";
import { maskEmail } from "./mask";
import { PROVIDER_TIMEOUT_MS } from "./sms";

export type EmailMessage = { to: string; subject: string; text: string; html: string };
export interface EmailSender { send(message: EmailMessage): Promise<{ id: string }> }

type Env = Readonly<Record<string, string | undefined>>;

export const consoleEmail: EmailSender = {
  async send({ to, subject, text }) {
    // The body can carry an order link with its token, so production logs only the subject.
    console.info(`[email:console] to ${maskEmail(to)}: ${subject}${process.env.NODE_ENV === "production" ? "" : `\n${text}`}`);
    return { id: `console-${randomUUID()}` };
  },
};

export const resendConfigured = (env: Env) => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

/** Resend's HTTP API in one request. Errors carry only the HTTP status. */
export function resendEmail(apiKey: string, from: string, timeoutMs = PROVIDER_TIMEOUT_MS): EmailSender {
  return {
    async send({ to, subject, text, html }) {
      let response: Response;
      try {
        response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [to], subject, text, html }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new Error("Resend request failed");
      }
      const body = await response.json().catch(() => null) as { id?: unknown } | null;
      if (!response.ok || typeof body?.id !== "string") throw new Error(`Resend responded ${response.status}`);
      return { id: body.id };
    },
  };
}

/** The one place that picks the email provider: Resend when fully configured, otherwise the console. */
export function createEmailSender(env: Env = process.env): EmailSender {
  return resendConfigured(env) ? resendEmail(env.RESEND_API_KEY!, env.EMAIL_FROM!) : consoleEmail;
}
