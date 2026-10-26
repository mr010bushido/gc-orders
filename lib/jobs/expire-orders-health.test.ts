import { afterEach, expect, it, vi } from "vitest";

const original = process.env.NODE_ENV;
afterEach(() => {
  if (original === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = original;
  vi.restoreAllMocks();
});

async function check(last: Date | null, environment: string) {
  vi.resetModules();
  process.env.NODE_ENV = environment;
  const { heartbeatStore } = await import("../platform/heartbeat");
  vi.spyOn(heartbeatStore, "last").mockResolvedValue(last);
  await import("./expire-orders-health");
  const { runHealthChecks } = await import("../platform/health");
  return runHealthChecks();
}

it("fails when the production heartbeat is missing or older than 45 minutes", async () => {
  const now = new Date("2026-10-20T08:00:00Z");
  const { heartbeatStore } = await import("../platform/heartbeat");
  vi.spyOn(heartbeatStore, "last").mockResolvedValue(null);
  process.env.NODE_ENV = "production";
  await import("./expire-orders-health");
  const { runHealthChecks } = await import("../platform/health");
  expect((await runHealthChecks()).checks["jobs:expire-orders"]).toBe("fail");

  vi.resetModules();
  const staleStore = await import("../platform/heartbeat");
  vi.spyOn(staleStore.heartbeatStore, "last").mockResolvedValue(new Date(now.getTime() - 50 * 60_000));
  await import("./expire-orders-health");
  const staleHealth = await import("../platform/health");
  expect((await staleHealth.runHealthChecks()).checks["jobs:expire-orders"]).toBe("fail");
});

it("passes with a fresh production heartbeat", async () => {
  vi.resetModules();
  process.env.NODE_ENV = "production";
  const { heartbeatStore } = await import("../platform/heartbeat");
  vi.spyOn(heartbeatStore, "last").mockResolvedValue(new Date(Date.now() - 44 * 60_000));
  await import("./expire-orders-health");
  const { runHealthChecks } = await import("../platform/health");
  expect((await runHealthChecks()).checks["jobs:expire-orders"]).toBe("ok");
});

it("passes outside production without a heartbeat", async () => {
  expect((await check(null, "preview")).checks["jobs:expire-orders"]).toBe("ok");
});
