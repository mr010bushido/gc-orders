import { afterEach, beforeEach, expect, it } from "vitest";
import { referenceCounters } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { allocateReference } from "./reference";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); });
afterEach(async () => { await test.close(); });

const now = new Date("2026-10-17T10:00:00Z");

it("starts each year at 0001", async () => {
  expect(await allocateReference(test.db, new Date("2027-01-01T10:00:00Z"))).toBe("CAKE-2027-0001");
  expect(await allocateReference(test.db, new Date("2027-01-01T11:00:00Z"))).toBe("CAKE-2027-0002");
  expect(await allocateReference(test.db, now)).toBe("CAKE-2026-0001");
});

it("uses the Lusaka year at the boundary", async () => {
  expect(await allocateReference(test.db, new Date("2026-12-31T23:30:00Z"))).toBe("CAKE-2027-0001");
  expect(await allocateReference(test.db, new Date("2026-12-31T21:59:59Z"))).toBe("CAKE-2026-0001");
});

it("gives 20 concurrent orders distinct consecutive numbers", async () => {
  const references = await Promise.all(Array.from({ length: 20 }, () => test.db.transaction(tx => allocateReference(tx, now))));
  expect(references.sort()).toEqual(Array.from({ length: 20 }, (_, i) => `CAKE-2026-${String(i + 1).padStart(4, "0")}`));
});

it("reuses a number taken by a rolled-back transaction", async () => {
  await expect(test.db.transaction(async (tx) => {
    expect(await allocateReference(tx, now)).toBe("CAKE-2026-0001");
    throw new Error("order insert failed");
  })).rejects.toThrow("order insert failed");
  expect(await allocateReference(test.db, now)).toBe("CAKE-2026-0001");
});

it("grows beyond four digits", async () => {
  await test.db.insert(referenceCounters).values({ year: 2026, lastNumber: 9999 });
  expect(await allocateReference(test.db, now)).toBe("CAKE-2026-10000");
});
