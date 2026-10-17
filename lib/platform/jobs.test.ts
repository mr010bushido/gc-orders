import { afterEach, expect, it } from "vitest";
import { verifySecret } from "./jobs";

const original = process.env.JOBS_SECRET;
afterEach(() => { process.env.JOBS_SECRET = original; });

it("accepts the configured secret", () => {
  process.env.JOBS_SECRET = "long-secret";
  expect(verifySecret("long-secret")).toBe(true);
});

it("rejects a wrong secret", () => {
  process.env.JOBS_SECRET = "long-secret";
  expect(verifySecret("wrong-secret")).toBe(false);
});

it("rejects a different length without throwing", () => {
  process.env.JOBS_SECRET = "long-secret";
  expect(verifySecret("short")).toBe(false);
});

it("rejects an empty supplied value", () => {
  process.env.JOBS_SECRET = "long-secret";
  expect(verifySecret("")).toBe(false);
});

it("rejects when the configured secret is unset or empty", () => {
  delete process.env.JOBS_SECRET;
  expect(verifySecret("long-secret")).toBe(false);
  process.env.JOBS_SECRET = "";
  expect(verifySecret("long-secret")).toBe(false);
});
