import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { connect, drizzle } = vi.hoisted(() => ({
  connect: vi.fn(() => ({})),
  drizzle: vi.fn(() => ({})),
}));
vi.mock("postgres", () => ({ default: connect }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("DATABASE_POOL_MAX", undefined);
});
afterEach(() => vi.unstubAllEnvs());

it("imports without connecting and names the missing variable on demand", async () => {
  const { getDb } = await import("./index");
  expect(connect).not.toHaveBeenCalled();
  expect(getDb).toThrow("DATABASE_URL is required");
});

it("creates one lazy, unprepared connection with a pool of one", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
  const { getDb } = await import("./index");
  expect(getDb()).toBe(getDb());
  expect(connect).toHaveBeenCalledExactlyOnceWith(process.env.DATABASE_URL, { prepare: false, max: 1 });
});

it("accepts a larger VPS pool", async () => {
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
  vi.stubEnv("DATABASE_POOL_MAX", "4");
  const { getDb } = await import("./index");
  getDb();
  expect(connect).toHaveBeenCalledWith(process.env.DATABASE_URL, { prepare: false, max: 4 });
});

it.each(["", "0", "-1", "1.5", "invalid", "Infinity"])("rejects invalid pool size %s", async (max) => {
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost/test");
  vi.stubEnv("DATABASE_POOL_MAX", max);
  const { getDb } = await import("./index");
  expect(getDb).toThrow("DATABASE_POOL_MAX must be a positive integer");
  expect(connect).not.toHaveBeenCalled();
});
