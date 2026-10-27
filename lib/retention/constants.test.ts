import { expect, it } from "vitest";
import { lusakaDateAfterDays, lusakaDateAfterYears } from "./constants";
import { todayInLusaka } from "../availability/availability";

it("uses calendar-day and calendar-year retention boundaries", () => {
  expect(lusakaDateAfterDays("2026-01-01", 90)).toBe("2026-04-01");
  expect(lusakaDateAfterYears("2024-02-29", 2)).toBe("2026-02-28");
  expect(todayInLusaka(new Date("2026-01-01T22:00:00Z"))).toBe("2026-01-02");
});
