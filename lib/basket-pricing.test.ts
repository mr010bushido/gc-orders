import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, PricingError, earliestEventDate, isCakeRushDate, priceBasket, type BasketInput } from "./basket-pricing";

const now = new Date("2026-09-10T12:00:00+02:00");
const cake = { flavourGroup: "classic", tierSizes: [8], addons: [] } as const;
const input: BasketInput = {
  eventDate: "2026-09-16",
  delivery: false,
  desserts: [{ type: "cupcakes", quantity: 30 }],
};

describe("basket pricing", () => {
  it("rejects an empty basket", () => {
    expect(() => priceBasket({ ...input, desserts: [] }, now)).toThrow(expect.objectContaining({ code: "EMPTY_BASKET" }));
  });

  it("prices a cake-only basket", () => {
    expect(priceBasket({ ...input, cake, desserts: [] }, now)).toMatchObject({ total: 1040, deposit: 520 });
  });

  it("rejects a dessert line below the minimum", () => {
    expect(() => priceBasket({ ...input, desserts: [{ type: "cupcakes", quantity: 29 }] }, now)).toThrow(expect.objectContaining({ code: "DESSERT_MIN_QUANTITY" }));
  });

  it("does not charge for mixed-flavour notes", () => {
    const result = priceBasket({ ...input, desserts: [{ type: "cupcakes", quantity: 30, note: "10 vanilla, 10 chocolate, 10 lemon" }] }, now);
    expect(result.lines).toEqual([expect.objectContaining({ kind: "dessert", quantity: 30, unitAmount: 30, amount: 900 })]);
  });

  it("rejects unknown dessert types", () => {
    expect(() => priceBasket({ ...input, desserts: [{ type: "toString", quantity: 30 }] }, now)).toThrow(expect.objectContaining({ code: "UNKNOWN_DESSERT" }));
  });

  it("refuses dessert-only baskets with four and a half days of notice", () => {
    expect(() => priceBasket({ ...input, eventDate: "2026-09-15" }, now)).toThrow(expect.objectContaining({ code: "DESSERT_LEAD_TIME" }));
  });

  it("accepts dessert-only baskets with enough notice", () => {
    expect(priceBasket(input, now)).toMatchObject({ total: 900, deposit: 450 });
  });

  it.each([
    ["2026-09-13", 0, 180, 2120, 1060],
    ["2026-09-12", 208, 180, 2328, 1164],
    ["2026-09-16", 0, 0, 1940, 970],
  ])("prices separate cake and dessert fees for %s", (eventDate, rush, surcharge, total, deposit) => {
    const result = priceBasket({ ...input, cake, eventDate }, now);
    expect(result.lines.find(line => line.kind === "rush")?.amount ?? 0).toBe(rush);
    expect(result.lines.find(line => line.kind === "dessert_surcharge")?.amount ?? 0).toBe(surcharge);
    expect(result).toMatchObject({ total, deposit });
  });

  it("charges one delivery fee for cake and desserts", () => {
    const result = priceBasket({ ...input, cake, delivery: true }, now);
    expect(result.total).toBe(2090);
    expect(result.lines.filter(line => line.kind === "delivery")).toEqual([expect.objectContaining({ amount: 150 })]);
  });

  it("includes owner quote lines in total and deposit", () => {
    expect(priceBasket({ ...input, cake, desserts: [], quoteLines: [{ label: "Bespoke decoration", amount: 500 }] }, now)).toMatchObject({ total: 1540, deposit: 770 });
  });

  it.each([0, 12.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER, "500"])("rejects invalid quote amount %s", amount => {
    const invalid = { ...input, quoteLines: [{ label: "Decoration", amount }] };
    expect(() => priceBasket(JSON.parse(JSON.stringify(invalid)), now)).toThrow(expect.objectContaining({ code: "INVALID_QUOTE_LINE" }));
  });

  it("returns ordered itemised lines that sum to total", () => {
    const result = priceBasket({ ...input, cake: { ...cake, addons: ["gloss_print"] }, eventDate: "2026-09-12", delivery: true, quoteLines: [{ label: "Decoration", amount: 500 }] }, now);
    expect(result.lines.map(line => line.kind)).toEqual(["cake", "rush", "addon", "dessert", "dessert_surcharge", "delivery", "quote"]);
    expect(result.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(result.total);
  });

  it("sums rounded lines but halves unrounded hundredths at a 20.06% rate", () => {
    const result = priceBasket({ ...input, cake: { ...cake, tierSizes: [16] }, eventDate: "2026-09-12" }, now, { ...DEFAULT_RULES, dessertSurchargeBasisPoints: 2006 });
    expect(result.lines.map(line => line.amount)).toEqual([2249, 450, 900, 181]);
    expect(result).toMatchObject({ total: 3780, deposit: 1890 });
  });

  it("does not halve an already-rounded cake total", () => {
    expect(priceBasket({ ...input, cake: { ...cake, tierSizes: [16] }, desserts: [], eventDate: "2026-09-12" }, now)).toMatchObject({ total: 2699, deposit: 1349 });
  });

  it("preserves fractional cake and dessert fees in the deposit basis", () => {
    const result = priceBasket({ ...input, cake: { ...cake, tierSizes: [16] }, eventDate: "2026-09-12" }, now, { ...DEFAULT_RULES, dessertSurchargeBasisPoints: 2001 });
    expect(result).toMatchObject({ total: 3779, deposit: 1889 });
    expect(result.lines.find(line => line.kind === "rush")?.amountHundredths).toBe(44980);
    expect(result.lines.find(line => line.kind === "dessert_surcharge")?.amountHundredths).toBe(18009);
  });

  it.each([
    { dessertUnitPrice: 0 },
    { minimumDessertQuantity: 0 },
    { dessertLeadTimeDays: -1 },
    { dessertSurchargeBasisPoints: NaN },
    { dessertSurchargeBasisPoints: 2000.5 },
    { deliveryFee: Infinity },
    { dessertSurchargeBasisPoints: undefined },
  ])("rejects invalid pricing rules %s", overrides => {
    expect(() => priceBasket(input, now, JSON.parse(JSON.stringify({ ...DEFAULT_RULES, ...overrides })))).toThrow(RangeError);
  });

  it("keeps quote lines outside both short-notice fees", () => {
    const result = priceBasket({ ...input, cake, eventDate: "2026-09-12", quoteLines: [{ label: "Decoration", amount: 500 }] }, now);
    expect(result).toMatchObject({ total: 2828, deposit: 1414 });
  });

  it("prices quote-only baskets without dessert lead-time restrictions", () => {
    expect(priceBasket({ ...input, desserts: [], eventDate: "2026-09-11", quoteLines: [{ label: "Wedding cake", amount: 501 }] }, now)).toMatchObject({ total: 501, deposit: 251 });
  });

  it.each(["cupcakes", "brownies", "lemon_bars", "cake_cups", "cheesecake_cups", "chocolate_mousse", "trifle_in_a_cup", "coconut_balls", "milk_tart", "apple_crumble", "cake_pops"])("prices catalogue dessert %s", type => {
    expect(priceBasket({ ...input, desserts: [{ type, quantity: 30 }] }, now).total).toBe(900);
  });

  it.each([0, -1, 29, 30.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, "30"])("rejects invalid dessert quantity %s", quantity => {
    expect(() => priceBasket(JSON.parse(JSON.stringify({ ...input, desserts: [{ type: "cupcakes", quantity }] })), now)).toThrow(expect.objectContaining({ code: "DESSERT_MIN_QUANTITY" }));
  });

  it.each(["2026-02-30", "2026-13-01", "2026-9-16", "2026-09-09", "2026-09-10", "not-a-date"])("rejects invalid dessert-only event date %s", eventDate => {
    expect(() => priceBasket({ ...input, eventDate }, now)).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });

  it("wraps cake validation errors as INVALID_CAKE", () => {
    expect(() => priceBasket({ ...input, cake: { ...cake, tierSizes: [] } }, now)).toThrow(expect.objectContaining({ code: "INVALID_CAKE" }));
    expect(() => priceBasket({ ...input, cake, eventDate: "2026-02-30" }, now)).toThrow(expect.objectContaining({ code: "INVALID_CAKE" }));
  });

  it("rejects same-day Lusaka dates when UTC is still yesterday", () => {
    expect(() => priceBasket({ ...input, eventDate: "2026-09-15" }, new Date("2026-09-14T23:30:00Z"))).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
  });

  it("accepts exactly five days and rejects one millisecond less for desserts only", () => {
    const boundary = new Date("2026-09-10T22:00:00Z");
    expect(priceBasket(input, boundary).total).toBe(900);
    expect(() => priceBasket(input, new Date(boundary.getTime() + 1))).toThrow(expect.objectContaining({ code: "DESSERT_LEAD_TIME" }));
    expect(priceBasket({ ...input, cake }, boundary).lines.some(line => line.kind === "dessert_surcharge")).toBe(false);
    expect(priceBasket({ ...input, cake }, new Date(boundary.getTime() + 1)).lines.find(line => line.kind === "dessert_surcharge")?.amount).toBe(180);
  });

  it("uses configured prices, minimum, delivery and lead time", () => {
    const rules = { ...DEFAULT_RULES, dessertUnitPrice: 35, minimumDessertQuantity: 10, dessertLeadTimeDays: 2, deliveryFee: 200 };
    expect(priceBasket({ ...input, eventDate: "2026-09-13", delivery: true, desserts: [{ type: "brownies", quantity: 10 }] }, now, rules)).toMatchObject({ total: 550, deposit: 275 });
  });

  it.each(['{"desserts":null}', '{"desserts":[null]}', '{"desserts":[{}]}', '{"desserts":[{"type":"cupcakes","quantity":30,"note":5}]}', '{"quoteLines":null}', '{"quoteLines":[null]}', '{"quoteLines":[{"label":" ","amount":500}]}', '{"delivery":"false"}'])("rejects malformed external input %s", payload => {
    expect(() => priceBasket({ ...input, ...JSON.parse(payload) }, now)).toThrow();
  });

  it("rejects sparse dessert and quote arrays", () => {
    expect(() => priceBasket({ ...input, desserts: new Array(1) }, now)).toThrow();
    expect(() => priceBasket({ ...input, quoteLines: new Array(1) }, now)).toThrow();
  });

  it("rejects invalid clocks and null input", () => {
    expect(() => priceBasket(input, new Date("invalid"))).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
    expect(() => priceBasket(JSON.parse("null"), now)).toThrow();
  });

  it("uses coded RangeErrors", () => {
    const error = new PricingError("EMPTY_BASKET", "A basket needs an item");
    expect(error).toBeInstanceOf(RangeError);
    expect(error.code).toBe("EMPTY_BASKET");
  });

  it("returns the cake earliest date near midnight UTC", () => {
    const instant = new Date("2026-09-14T23:30:00Z");
    expect(earliestEventDate(true, instant)).toBe("2026-09-16");
    expect(priceBasket({ ...input, cake, desserts: [], eventDate: earliestEventDate(true, instant) }, instant).total).toBe(1248);
  });

  it("returns the dessert-only earliest date", () => {
    expect(earliestEventDate(false, now)).toBe("2026-09-16");
    expect(priceBasket({ ...input, eventDate: earliestEventDate(false, now) }, now).total).toBe(900);
  });

  it("identifies rush dates separately from dessert notice", () => {
    expect(isCakeRushDate("2026-09-11", now)).toBe(true);
    expect(isCakeRushDate("2026-09-12", now)).toBe(true);
    expect(isCakeRushDate("2026-09-13", now)).toBe(false);
  });

  it.each([
    ["2026-09-10T21:59:59.999Z", "2026-09-11", "2026-09-16"],
    ["2026-09-10T22:00:00.000Z", "2026-09-12", "2026-09-16"],
    ["2026-09-10T22:00:00.001Z", "2026-09-12", "2026-09-17"],
    ["2026-12-31T23:30:00Z", "2027-01-02", "2027-01-07"],
    ["2028-02-28T23:30:00Z", "2028-03-01", "2028-03-06"],
  ])("handles date rollover at %s", (instant, cakeDate, dessertDate) => {
    const clock = new Date(instant);
    expect(earliestEventDate(true, clock)).toBe(cakeDate);
    expect(earliestEventDate(false, clock)).toBe(dessertDate);
    expect(priceBasket({ ...input, eventDate: dessertDate }, clock).total).toBe(900);
    const previousDate = new Date(Date.parse(`${dessertDate}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    expect(() => priceBasket({ ...input, eventDate: previousDate }, clock)).toThrow(expect.objectContaining({ code: "DESSERT_LEAD_TIME" }));
  });

  it.each([
    ["2026-09-10T21:59:59.999Z", false],
    ["2026-09-10T22:00:00.000Z", false],
    ["2026-09-10T22:00:00.001Z", true],
  ])("uses a strict 48-hour rush boundary at %s", (instant, rush) => {
    const clock = new Date(instant);
    expect(isCakeRushDate("2026-09-13", clock)).toBe(rush);
    const result = priceBasket({ ...input, cake, desserts: [], eventDate: "2026-09-13" }, clock);
    expect(result.lines.some(line => line.kind === "rush")).toBe(rush);
  });

  it("rejects invalid dates and clocks in the date helpers", () => {
    expect(() => earliestEventDate(true, new Date("invalid"))).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
    expect(() => isCakeRushDate("2026-09-16", new Date("invalid"))).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
    for (const date of ["2026-02-30", "2026-9-16", "2026-09-10", "2026-09-09"]) {
      expect(() => isCakeRushDate(date, now)).toThrow(expect.objectContaining({ code: "INVALID_DATE" }));
    }
  });
});
