import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { execute, getDb, last } = vi.hoisted(() => ({ execute: vi.fn(), getDb: vi.fn(), last: vi.fn() }));
vi.mock("../../../lib/db", () => ({ getDb }));
vi.mock("../../../lib/platform/heartbeat", () => ({ heartbeatStore: { last, record: vi.fn() } }));
beforeEach(() => {
  vi.resetModules();
  execute.mockReset().mockResolvedValue([]);
  getDb.mockReset().mockReturnValue({ execute });
  last.mockReset().mockResolvedValue(new Date());
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it("returns 200 and both named checks when all pass", async () => {
  const { registerHealthCheck } = await import("../../../lib/platform/health");
  const { GET } = await import("./route");
  registerHealthCheck("one", () => {});
  registerHealthCheck("two", () => {});
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: { database: "ok", "jobs:expire-orders": "ok", "jobs:retention": "ok", notifications: "ok", one: "ok", two: "ok" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 without a failing check's connection string", async () => {
  execute.mockRejectedValue(new Error("postgres://user:password@host/db"));
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).toBe('{"status":"fail","checks":{"database":"fail","jobs:expire-orders":"ok","jobs:retention":"ok","notifications":"ok"}}');
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("always registers the database and notifications checks", async () => {
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", checks: { database: "ok", "jobs:expire-orders": "ok", "jobs:retention": "ok", notifications: "ok" } });
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("returns 503 when database configuration is missing without exposing errors", async () => {
  getDb.mockImplementation(() => { throw new Error("DATABASE_URL is required"); });
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "fail", checks: { database: "fail", "jobs:expire-orders": "ok", "jobs:retention": "ok", notifications: "ok" } });
});

it("fails after two seconds even when the driver never resolves", async () => {
  vi.useFakeTimers();
  execute.mockReturnValue(new Promise(() => {}));
  const { GET } = await import("./route");
  const pending = GET();
  await vi.advanceTimersByTimeAsync(2000);
  const response = await pending;
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "fail", checks: { database: "fail", "jobs:expire-orders": "ok", "jobs:retention": "ok", notifications: "ok" } });
  expect(vi.getTimerCount()).toBe(0);
});

it("returns 200 degraded when production has no notification credentials", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "");
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('{"status":"degraded","checks":{"database":"ok","jobs:expire-orders":"ok","jobs:retention":"ok","notifications":"degraded"}}');
  expect(response.headers.get("cache-control")).toBe("no-store");
});

it("lets a failing check outrank a degraded one", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "");
  execute.mockRejectedValue(new Error("down"));
  const { GET } = await import("./route");
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "fail", checks: { database: "fail", "jobs:expire-orders": "ok", "jobs:retention": "ok", notifications: "degraded" } });
});
