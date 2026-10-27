import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.resetModules(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("fails for missing or stale production heartbeats and passes for fresh/non-production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { heartbeatStore } = await import("../platform/heartbeat");
  vi.spyOn(heartbeatStore, "last").mockResolvedValue(null);
  const { checkRetentionHeartbeat } = await import("./retention-health");
  const now = new Date("2026-10-27T12:00:00Z");
  await expect(checkRetentionHeartbeat(now)).rejects.toThrow();
  vi.mocked(heartbeatStore.last).mockResolvedValue(new Date(now.getTime() - 37 * 60 * 60_000));
  await expect(checkRetentionHeartbeat(now)).rejects.toThrow();
  vi.mocked(heartbeatStore.last).mockResolvedValue(new Date(now.getTime() - 35 * 60 * 60_000));
  await expect(checkRetentionHeartbeat(now)).resolves.toBeUndefined();
  vi.stubEnv("NODE_ENV", "test");
  vi.mocked(heartbeatStore.last).mockResolvedValue(null);
  await expect(checkRetentionHeartbeat(now)).resolves.toBeUndefined();
});
