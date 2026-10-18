import { afterAll, beforeAll, expect, it } from "vitest";
import { dateDecisions } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { getClosedDates, isDateOpen } from "./availability";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const decidedAt = new Date("2026-10-17T08:00:00Z");

it("closes a manually blocked date and lists it in range", async () => {
  await test.db.insert(dateDecisions).values({ eventDate: "2026-12-25", state: "closed", reason: "manual", note: "Christmas", decidedAt });
  expect(await isDateOpen(test.db, "2026-12-25")).toBe(false);
  expect(await isDateOpen(test.db, "2026-12-26")).toBe(true);
  expect(await getClosedDates(test.db, "2026-12-01", "2026-12-31")).toEqual(["2026-12-25"]);
});

it("lists only closed dates inside the inclusive range, in order", async () => {
  await test.db.insert(dateDecisions).values([
    { eventDate: "2027-01-03", state: "closed", reason: "capacity", decidedAt },
    { eventDate: "2027-01-01", state: "closed", reason: "manual", decidedAt },
    { eventDate: "2027-01-02", state: "open", confirmedCountAtDecision: 10, decidedAt },
    { eventDate: "2027-01-04", state: "closed", reason: "manual", decidedAt },
  ]);
  expect(await getClosedDates(test.db, "2027-01-01", "2027-01-03")).toEqual(["2027-01-01", "2027-01-03"]);
  expect(await isDateOpen(test.db, "2027-01-02")).toBe(true);
});

it("rejects malformed dates", async () => {
  await expect(isDateOpen(test.db, "25/12/2026")).rejects.toThrow(RangeError);
  await expect(getClosedDates(test.db, "2026-12-01", "tomorrow")).rejects.toThrow(RangeError);
});

it("refuses rows that break the decision shape", async () => {
  await expect(test.db.insert(dateDecisions).values({ eventDate: "2027-02-01", state: "closed", decidedAt })).rejects.toThrow();
  await expect(test.db.insert(dateDecisions).values({ eventDate: "2027-02-02", state: "open", decidedAt })).rejects.toThrow();
});
