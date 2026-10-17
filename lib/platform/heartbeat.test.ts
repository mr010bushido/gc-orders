import { expect, it } from "vitest";
import { MemoryHeartbeatStore } from "./heartbeat";

it("records and returns the last run", async () => {
  const store = new MemoryHeartbeatStore();
  const first = new Date("2026-01-01T00:00:00Z");
  const latest = new Date("2026-01-02T00:00:00Z");
  await store.record("expire", first);
  expect(await store.last("expire")).toEqual(first);
  await store.record("expire", latest);
  expect(await store.last("expire")).toEqual(latest);
});

it("returns null for a job that never ran", async () => {
  expect(await new MemoryHeartbeatStore().last("never")).toBeNull();
});
