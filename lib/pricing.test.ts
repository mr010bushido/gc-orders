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
  it.each<{ scenario: string; overrides: Partial<QuoteInput> }>([
    { scenario: "Single tier", overrides: {} },
    { scenario: "Multiple tiers", overrides: { flavourGroup: "signature", tierSizes: [8, 10] } },
    { scenario: "Within 48 hours", overrides: { flavourGroup: "fruit", tierSizes: [10], addons: ["message_topper"], delivery: true, eventDate: "2026-09-16" } },
    { scenario: "Outside 48 hours", overrides: { eventDate: "2026-09-17" } },
    { scenario: "Gloss print with delivery", overrides: { flavourGroup: "signature", tierSizes: [8, 10], addons: ["gloss_print"], delivery: true } },
    { scenario: "Deposit rounding", overrides: { flavourGroup: "fruit", tierSizes: [10], addons: ["message_topper"], delivery: true, eventDate: "2026-09-16" } },
    { scenario: "Fractional rush", overrides: { tierSizes: [16], eventDate: "2026-09-16" } },
    { scenario: "Every add-on once", overrides: { addons: ["edible_print", "gloss_print", "message_topper", "edible_print"] } },
  ])("returns lines summing to the total for $scenario", ({ overrides }) => {
    const result = quote({ ...input, ...overrides }, now);
    expect(result.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(result.total);
    expect(JSON.parse(JSON.stringify(result)).lines).toEqual(result.lines);
    for (const line of result.lines) {
      expect(line.quantity).toBe(1);
      expect(line.unitAmount).toBe(line.amount);
      expect(line.label.length).toBeGreaterThan(0);
    }
  });

  it("orders cake, rush, unique add-ons and delivery lines", () => {
    const result = quote({ ...input, addons: ["gloss_print", "edible_print", "gloss_print"], delivery: true, eventDate: "2026-09-16" }, now);
    expect(result.lines).toEqual([
      { kind: "cake", label: "Cake", quantity: 1, unitAmount: 1040, amount: 1040 },
      { kind: "rush", label: "Cake rush", quantity: 1, unitAmount: 208, amount: 208 },
      { kind: "addon", label: "gloss print", quantity: 1, unitAmount: 75, amount: 75 },
      { kind: "addon", label: "edible print", quantity: 1, unitAmount: 100, amount: 100 },
      { kind: "delivery", label: "Delivery", quantity: 1, unitAmount: 150, amount: 150 },
    ]);
  });

  it("prices a single classic 8-inch tier for pickup", () => {
    expect(quote(input, now)).toEqual({
      cake: 1040, rushFee: 0, addons: 0, delivery: 0, total: 1040, deposit: 520,
      lines: expect.any(Array),
    });
  });

  it("sums tier multipliers before adding a gloss print and delivery", () => {
    expect(quote({ ...input, flavourGroup: "signature", tierSizes: [8, 10], addons: ["gloss_print"], delivery: true }, now)).toEqual({
      cake: 2520, rushFee: 0, addons: 75, delivery: 150, total: 2745, deposit: 1373,
      lines: expect.any(Array),
    });
  });

  it("applies the rush fee to cake only and halves the unrounded total", () => {
    expect(quote({ ...input, flavourGroup: "fruit", tierSizes: [10], addons: ["message_topper"], delivery: true, eventDate: "2026-09-16" }, now)).toEqual({
      cake: 2000, rushFee: 400, addons: 100, delivery: 150, total: 2650, deposit: 1325,
      lines: expect.any(Array),
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

  it("rejects sparse tier arrays, including partially filled arrays", () => {
    const emptyTiers = new Array<8>(1);
    const partialTiers: 8[] = [8];
    partialTiers.length = 2;
    for (const tierSizes of [emptyTiers, partialTiers]) {
      expect(() => quote({ ...input, tierSizes }, now)).toThrow("tier size");
    }
  });

  it("charges every add-on once, like the Python set", () => {
    expect(quote({ ...input, addons: ["edible_print", "gloss_print", "message_topper", "edible_print"] }, now).addons).toBe(275);
  });

  it("rounds fractional rush and total half-up without rounding before the deposit", () => {
    expect(quote({ ...input, tierSizes: [16], eventDate: "2026-09-16" }, now)).toEqual({
      cake: 2249, rushFee: 450, addons: 0, delivery: 0, total: 2699, deposit: 1349,
      lines: expect.any(Array),
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
    ['{"addons":[["gloss_print"],["gloss_print"]]}', "add-on"],
    ['{"delivery":"false"}', "delivery"],
  ])("rejects invalid catalogue or delivery JSON: %s", (payload, message) => {
    expect(() => quote({ ...input, ...JSON.parse(payload) }, now)).toThrow(message);
  });
});
