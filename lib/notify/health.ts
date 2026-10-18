import { registerHealthCheck } from "../platform/health";
import { resendConfigured } from "./email";
import { twilioConfigured } from "./sms";

/** Production without either provider (console sender) or without the link origin is misconfigured. Names no variable. */
export function notificationsHealth(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.NODE_ENV === "production" && !(twilioConfigured(env) && resendConfigured(env) && env.APP_URL) ? "degraded" as const : undefined;
}

registerHealthCheck("notifications", () => notificationsHealth());
