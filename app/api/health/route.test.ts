import { beforeEach, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());

it("returns 200 and both named checks when all pass", async () => {
  const { registerHealthCheck } = await import("../../../lib/platform/health");
  const { GET } = await import("./route");
  registerHealthCheck("one", () => {});
  registerHealthCheck("two", () => {});
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: { one: "ok", two: "ok" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 without a failing check's connection string", async () => {
  const { registerHealthCheck } = await import("../../../lib/platform/health");
  const { GET } = await import("./route");
  registerHealthCheck("db", () => { throw new Error("postgres://user:password@host/db"); });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('{"status":"fail","checks":{"db":"fail"}}');
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 200 with an empty map when no checks are registered", async () => {
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: {} });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
