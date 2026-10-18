import { expect, it } from "vitest";
import { maskEmail, maskPhone, summariseError } from "./mask";

// Built at runtime so secret scanners do not mistake the fake SID for a real one.
const FAKE_SID = "AC" + "0123456789abcdef".repeat(2);

it.each([["+260977123456", "+260 ••• ••• 456"], ["+15005550006", "••• 006"]])("masks %s as %s", (phone, masked) => {
  expect(maskPhone(phone)).toBe(masked);
});

it.each([["mwila@example.com", "•••@example.com"], ["not-an-email", "•••"]])("keeps only the domain of %s", (email, masked) => {
  expect(maskEmail(email)).toBe(masked);
});

it.each([
  ["a Twilio account SID", `Account ${FAKE_SID} not found`, FAKE_SID],
  ["a Twilio auth token", "token 0123456789abcdef0123456789abcdef rejected", "0123456789abcdef0123456789abcdef"],
  ["a Resend key", "API key re_AbC123_xyz is invalid", "re_AbC123_xyz"],
  ["an auth header", "sent Authorization: Basic QUM6dG9rZW4=", "QUM6dG9rZW4="],
  ["a phone number", "cannot reach +260977123456", "977123456"],
  ["an email address", "bounced mwila@example.com", "mwila@"],
  ["a connection string", "connect postgres://app:hunter2@db/cakes", "hunter2"],
])("removes %s from the error summary", (_, message, secret) => {
  const summary = summariseError(new Error(message));
  expect(summary).not.toContain(secret);
  expect(summary.length).toBeGreaterThan(0);
});

it("caps the summary and describes non-errors generically", () => {
  expect(summariseError(new Error("x".repeat(500)))).toHaveLength(200);
  expect(summariseError(FAKE_SID)).toBe("unknown error");
  expect(summariseError(new Error(""))).toBe("unknown error");
});
