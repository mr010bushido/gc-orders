import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());

it("passes when all checks pass", async () => {
  const { registerHealthCheck, runHealthChecks } = await import("./health");
  registerHealthCheck("one", () => {});
  registerHealthCheck("two", async () => {});
  expect(await runHealthChecks()).toEqual({ status: "ok", checks: { one: "ok", two: "ok" } });
});

it("fails when one check rejects without exposing its error", async () => {
  const { registerHealthCheck, runHealthChecks } = await import("./health");
  registerHealthCheck("one", () => {});
  registerHealthCheck("two", () => { throw new Error("secret"); });
  expect(await runHealthChecks()).toEqual({ status: "fail", checks: { one: "ok", two: "fail" } });
});

it("passes with no checks", async () => {
  const { runHealthChecks } = await import("./health");
  expect(await runHealthChecks()).toEqual({ status: "ok", checks: {} });
});

it("replaces a check with the same name", async () => {
  const { registerHealthCheck, runHealthChecks } = await import("./health");
  const old = vi.fn();
  registerHealthCheck("db", old);
  registerHealthCheck("db", () => {});
  expect(await runHealthChecks()).toEqual({ status: "ok", checks: { db: "ok" } });
  expect(old).not.toHaveBeenCalled();
});
