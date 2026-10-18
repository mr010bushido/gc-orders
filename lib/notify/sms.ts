import { randomUUID } from "node:crypto";
import { maskPhone } from "./mask";

export type SmsMessage = { to: string; text: string };
export interface SmsSender { send(message: SmsMessage): Promise<{ id: string }> }

type Env = Readonly<Record<string, string | undefined>>;

export const consoleSms: SmsSender = {
  async send({ to, text }) {
    // The text can carry an order link with its token, so production logs only the length.
    console.info(`[sms:console] to ${maskPhone(to)}: ${process.env.NODE_ENV === "production" ? `${text.length} chars` : text}`);
    return { id: `console-${randomUUID()}` };
  },
};

export const twilioConfigured = (env: Env) => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);

/** Twilio's Messages API in one request. Errors carry only the HTTP status and Twilio's numeric error code. */
export function twilioSms(accountSid: string, authToken: string, from: string): SmsSender {
  return {
    async send({ to, text }) {
      let response: Response;
      try {
        response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` },
          body: new URLSearchParams({ To: to, From: from, Body: text }),
        });
      } catch {
        // fetch errors can echo the URL, which contains the account SID.
        throw new Error("Twilio request failed");
      }
      const body = await response.json().catch(() => null) as { sid?: unknown; code?: unknown } | null;
      if (!response.ok || typeof body?.sid !== "string") {
        throw new Error(`Twilio responded ${response.status}${typeof body?.code === "number" ? ` (code ${body.code})` : ""}`);
      }
      return { id: body.sid };
    },
  };
}

/** The one place that picks the SMS provider: Twilio when fully configured, otherwise the console. */
export function createSmsSender(env: Env = process.env): SmsSender {
  return twilioConfigured(env) ? twilioSms(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!, env.TWILIO_FROM!) : consoleSms;
}
