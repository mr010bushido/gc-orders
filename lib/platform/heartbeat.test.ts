import { afterEach, beforeEach, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { DatabaseHeartbeatStore } from "./heartbeat";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); });
afterEach(async () => { await test.close(); });

it("records and returns the last run", async () => {
  const store = new DatabaseHeartbeatStore(() => test.db);
  const first = new Date("2026-01-01T00:00:00Z");
  const latest = new Date("2026-01-02T00:00:00Z");
  await store.record("expire", first);
  expect(await store.last("expire")).toEqual(first);
  await store.record("expire", latest);
  expect(await store.last("expire")).toEqual(latest);
  await store.record("expire", first);
  expect(await new DatabaseHeartbeatStore(() => test.db).last("expire")).toEqual(latest);
});

it("returns null for a job that never ran", async () => {
  expect(await new DatabaseHeartbeatStore(() => test.db).last("never")).toBeNull();
});
