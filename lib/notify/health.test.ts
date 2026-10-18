import { expect, it } from "vitest";
import { notificationsHealth } from "./health";

const twilio = { TWILIO_ACCOUNT_SID: "AC-fake", TWILIO_AUTH_TOKEN: "fake-token", TWILIO_FROM: "+15005550006" };
const resend = { RESEND_API_KEY: "re_fake", EMAIL_FROM: "orders@example.com" };

it.each([
  ["production with both providers and the link origin", { NODE_ENV: "production", ...twilio, ...resend, APP_URL: "https://cakes.test" }, undefined],
  ["production without the link origin", { NODE_ENV: "production", ...twilio, ...resend }, "degraded"],
  ["production without credentials", { NODE_ENV: "production" }, "degraded"],
  ["production without Twilio", { NODE_ENV: "production", ...resend }, "degraded"],
  ["production without Resend", { NODE_ENV: "production", ...twilio }, "degraded"],
  ["development without credentials", { NODE_ENV: "development" }, undefined],
])("%s", (_, env, expected) => {
  expect(notificationsHealth(env)).toBe(expected);
});
