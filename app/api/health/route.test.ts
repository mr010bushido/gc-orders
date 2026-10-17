import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { execute, getDb } = vi.hoisted(() => ({ execute: vi.fn(), getDb: vi.fn() }));
vi.mock("../../../lib/db", () => ({ getDb }));
beforeEach(() => {
  vi.resetModules();
  execute.mockReset().mockResolvedValue([]);
  getDb.mockReset().mockReturnValue({ execute });
});
afterEach(() => vi.useRealTimers());

it("returns 200 and both named checks when all pass", async () => {
  const { registerHealthCheck } = await import("../../../lib/platform/health");
  const { GET } = await import("./route");
  registerHealthCheck("one", () => {});
  registerHealthCheck("two", () => {});
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: { database: "ok", one: "ok", two: "ok" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 without a failing check's connection string", async () => {
  execute.mockRejectedValue(new Error("postgres://user:password@host/db"));
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('{"status":"fail","checks":{"database":"fail"}}');
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("always registers the database check", async () => {
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: { database: "ok" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 when database configuration is missing without exposing errors", async () => {
  getDb.mockImplementation(() => { throw new Error("DATABASE_URL is required"); });
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "fail", checks: { database: "fail" } });
});

it("fails after two seconds even when the driver never resolves", async () => {
  vi.useFakeTimers();
  execute.mockReturnValue(new Promise(() => {}));
  const { GET } = await import("./route");
  const pending = GET();
  await vi.advanceTimersByTimeAsync(2000);
  const response = await pending;
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "fail", checks: { database: "fail" } });
  expect(vi.getTimerCount()).toBe(0);
});
