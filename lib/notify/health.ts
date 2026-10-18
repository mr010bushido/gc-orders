import { registerHealthCheck } from "../platform/health";
import { resendConfigured } from "./email";
import { twilioConfigured } from "./sms";

/** Production running either console sender is misconfigured: messages are not delivered. Names no variable. */
export function notificationsHealth(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.NODE_ENV === "production" && !(twilioConfigured(env) && resendConfigured(env)) ? "degraded" as const : undefined;
}

registerHealthCheck("notifications", () => notificationsHealth());
