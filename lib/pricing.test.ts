import { describe, expect, it } from "vitest";
import { quote, type QuoteInput } from "./pricing";

const now = new Date("2026-09-14T12:00:00+02:00");
const input: QuoteInput = {
  flavourGroup: "classic",
  tierSizes: [8],
  addons: [],
  delivery: false,
  eventDate: "2026-09-22",
};

describe("cake pricing", () => {
  it("prices a single classic 8-inch tier for pickup", () => {
    expect(quote(input, now)).toEqual({
      cake: 1040, rushFee: 0, addons: 0, delivery: 0, total: 1040, deposit: 520,
    });
  });

  it("sums tier multipliers before adding a gloss print and delivery", () => {
    expect(quote({ ...input, flavourGroup: "signature", tierSizes: [8, 10], addons: ["gloss_print"], delivery: true }, now)).toEqual({
      cake: 2520, rushFee: 0, addons: 75, delivery: 150, total: 2745, deposit: 1373,
    });
  });

  it("applies the rush fee to cake only and halves the unrounded total", () => {
    expect(quote({ ...input, flavourGroup: "fruit", tierSizes: [10], addons: ["message_topper"], delivery: true, eventDate: "2026-09-16" }, now)).toEqual({
      cake: 2000, rushFee: 400, addons: 100, delivery: 150, total: 2650, deposit: 1325,
    });
  });

  it.each([{ tierSizes: [] }, { tierSizes: [8, 10, 12, 14] }] as const)("rejects tier counts outside 1–3: $tierSizes", ({ tierSizes }) => {
    expect(() => quote({ ...input, tierSizes }, now)).toThrow("1-3 tiers");
  });

  it.each(["2026-09-13", "2026-09-14"])("rejects today or earlier: %s", (eventDate) => {
    expect(() => quote({ ...input, eventDate }, now)).toThrow("future");
  });

  it("rejects same-day Lusaka bookings even when UTC is still yesterday", () => {
    expect(() => quote({ ...input, eventDate: "2026-09-15" }, new Date("2026-09-14T23:30:00Z"))).toThrow("future");
  });

  it("allows tomorrow in Lusaka across the UTC date boundary", () => {
    expect(quote({ ...input, eventDate: "2026-09-16" }, new Date("2026-09-14T23:30:00Z")).rushFee).toBe(208);
  });

  it.each([
    ["2026-09-13T21:59:59.999Z", 0],
    ["2026-09-13T22:00:00Z", 0],
    ["2026-09-13T22:00:00.001Z", 208],
  ])("uses Lusaka midnight and a strict 48-hour boundary at %s", (instant, rushFee) => {
    expect(quote({ ...input, eventDate: "2026-09-16" }, new Date(instant)).rushFee).toBe(rushFee);
  });

  it.each([
    ["classic", 1300], ["signature", 1400], ["fruit", 2000], ["vegan_diabetic", 1700],
  ] as const)("preserves the %s flavour base", (flavourGroup, cake) => {
    expect(quote({ ...input, flavourGroup, tierSizes: [10] }, now).cake).toBe(cake);
  });

  it.each([[8, 1040], [10, 1300], [12, 1560], [14, 1872], [16, 2249]] as const)("preserves the %i-inch multiplier", (size, cake) => {
    expect(quote({ ...input, tierSizes: [size] }, now).cake).toBe(cake);
  });

  it("allows three tiers", () => {
    expect(quote({ ...input, tierSizes: [8, 10, 12] }, now).cake).toBe(3900);
  });

  it("charges every add-on once, like the Python set", () => {
    expect(quote({ ...input, addons: ["edible_print", "gloss_print", "message_topper", "edible_print"] }, now).addons).toBe(275);
  });

  it("rounds fractional rush and total half-up without rounding before the deposit", () => {
    expect(quote({ ...input, tierSizes: [16], eventDate: "2026-09-16" }, now)).toEqual({
      cake: 2249, rushFee: 450, addons: 0, delivery: 0, total: 2699, deposit: 1349,
    });
  });

  it("rounds half a Kwacha up", () => {
    expect(quote({ ...input, tierSizes: [16] }, now).deposit).toBe(1125);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-9-22", "2026-09-22T00:00:00Z", "not-a-date"])("rejects malformed or impossible calendar dates: %s", (eventDate) => {
    expect(() => quote({ ...input, eventDate }, now)).toThrow("event date");
  });

  it("rejects an invalid clock", () => {
    expect(() => quote(input, new Date("invalid"))).toThrow("now");
  });

  it.each([
    ['{"flavourGroup":"toString"}', "flavour"],
    ['{"tierSizes":[9]}', "tier size"],
    ['{"tierSizes":["8"]}', "tier size"],
    ['{"addons":["toString"]}', "add-on"],
    ['{"delivery":"false"}', "delivery"],
  ])("rejects invalid catalogue or delivery JSON: %s", (payload, message) => {
    expect(() => quote({ ...input, ...JSON.parse(payload) }, now)).toThrow(message);
  });
});
