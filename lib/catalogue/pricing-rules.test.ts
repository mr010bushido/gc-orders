import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, PricingError, earliestEventDate, isCakeRushDate, priceBasket, type BasketInput } from "../basket-pricing";
import { DEFAULT_CAKE_RULES, quote, type QuoteInput } from "../pricing";
import { buildCatalogue, defaultCatalogue, type Catalogue } from "./catalogue";
import { resolveFlavour } from "./lookup";
import { toPricingRules } from "./pricing-rules";
import { resolveSettings } from "./settings";

const catalogue = defaultCatalogue();
const rules = toPricingRules(catalogue);
// The original engine with the catalogue's add-on display names; every price and rate is the built-in default.
const original = { ...DEFAULT_CAKE_RULES, addonNames: { chocolate_drip: "Chocolate drip", edible_print: "Edible print", gloss_print: "Gloss print", message_topper: "Message topper" } };

// Captures either the result or the thrown error so rejections are compared too.
function outcome(price: () => unknown) {
  try {
    return { result: price() };
  } catch (error) {
    return { error: String(error), code: (error as { code?: string }).code };
  }
}

describe("toPricingRules on the seeded catalogue", () => {
  it("matches the original engine's tables and rates", () => {
    expect(rules.cake).toEqual(original);
    const { dessertTypes, cake, ...numbers } = rules;
    expect(cake).toBeDefined();
    expect(numbers).toEqual(DEFAULT_RULES);
    expect(Object.values(dessertTypes!).every(d => d.price === 30)).toBe(true);
    expect(Object.keys(dessertTypes!)).toHaveLength(11);
  });

  describe("reproduces every cake-pricing scenario", () => {
    const now = new Date("2026-09-14T12:00:00+02:00");
    const base: QuoteInput = { flavourGroup: "classic", tierSizes: [8], addons: [], delivery: false, eventDate: "2026-09-22" };
    it.each<[string, Partial<QuoteInput>, Date?]>([
      ["single tier", {}],
      ["multiple tiers", { flavourGroup: "signature", tierSizes: [8, 10] }],
      ["zero tiers", { tierSizes: [] }],
      ["four tiers", { tierSizes: [8, 10, 12, 14] }],
      ["same day", { eventDate: "2026-09-14" }],
      ["same day across UTC midnight", { eventDate: "2026-09-15" }, new Date("2026-09-14T23:30:00Z")],
      ["within 48 hours", { flavourGroup: "fruit", tierSizes: [10], addons: ["message_topper"], delivery: true, eventDate: "2026-09-16" }],
      ["outside 48 hours", { eventDate: "2026-09-17" }],
      ["gloss print with delivery", { flavourGroup: "signature", tierSizes: [8, 10], addons: ["gloss_print"], delivery: true }],
      ["fractional rush", { tierSizes: [16], eventDate: "2026-09-16" }],
    ])("%s", (_, overrides, clock = now) => {
      const input = { ...base, ...overrides };
      expect(outcome(() => quote(input, clock, rules.cake))).toEqual(outcome(() => quote(input, clock, original)));
    });

    it("matches on every flavour group, tier combination, add-on set, delivery choice and date", () => {
      const sizes = [8, 10, 12, 14, 16];
      const tiers = [...sizes.map(a => [a]), ...sizes.flatMap(a => sizes.map(b => [a, b])), ...sizes.flatMap(a => sizes.flatMap(b => sizes.map(c => [a, b, c])))];
      const addonSets = [[], ["chocolate_drip"], ["edible_print"], ["gloss_print"], ["message_topper"], ["chocolate_drip", "edible_print", "gloss_print", "message_topper"]];
      let compared = 0;
      for (const flavourGroup of Object.keys(DEFAULT_CAKE_RULES.flavourPrices)) {
        for (const tierSizes of tiers) {
          for (const addons of addonSets) {
            for (const delivery of [false, true]) {
              for (const eventDate of ["2026-09-15", "2026-09-16", "2026-09-17"]) {
                const input = { flavourGroup, tierSizes, addons, delivery, eventDate };
                expect(quote(input, now, rules.cake)).toEqual(quote(input, now, original));
                compared++;
              }
            }
          }
        }
      }
      expect(compared).toBe(4 * 155 * 6 * 2 * 3);
    });
  });

  describe("reproduces every basket-pricing scenario", () => {
    const now = new Date("2026-09-10T12:00:00+02:00");
    const cake = { flavourGroup: "classic", tierSizes: [8], addons: [] };
    const cupcakes = [{ type: "cupcakes", quantity: 30 }];
    it.each<[string, BasketInput, Date?]>([
      ["empty basket", { delivery: false, eventDate: "2026-09-16" }],
      ["cake only", { cake, delivery: false, eventDate: "2026-09-16" }],
      ["below minimum", { desserts: [{ type: "cupcakes", quantity: 29 }], delivery: false, eventDate: "2026-09-16" }],
      ["mixed-flavour note", { desserts: [{ type: "cupcakes", quantity: 30, note: "10 vanilla, 10 chocolate, 10 lemon" }], delivery: false, eventDate: "2026-09-16" }],
      ["unknown dessert", { desserts: [{ type: "eclairs", quantity: 30 }], delivery: false, eventDate: "2026-09-16" }],
      ["dessert-only short notice", { desserts: cupcakes, delivery: false, eventDate: "2026-09-15" }],
      ["dessert-only enough notice", { desserts: cupcakes, delivery: false, eventDate: "2026-09-16" }],
      ["dessert surcharge without rush", { cake, desserts: cupcakes, delivery: false, eventDate: "2026-09-13" }],
      ["dessert surcharge with rush", { cake, desserts: cupcakes, delivery: false, eventDate: "2026-09-12" }],
      ["no fees five days out", { cake, desserts: cupcakes, delivery: false, eventDate: "2026-09-16" }],
      ["one delivery fee", { cake, desserts: cupcakes, delivery: true, eventDate: "2026-09-16" }],
      ["quote line", { cake, delivery: false, eventDate: "2026-09-16", quoteLines: [{ label: "Bespoke decoration", amount: 500 }] }],
      ["invalid quote line", { cake, delivery: false, eventDate: "2026-09-16", quoteLines: [{ label: "Decoration", amount: 12.5 }] }],
      ["same-day cake across UTC midnight", { cake, delivery: false, eventDate: "2026-09-15" }, new Date("2026-09-14T23:30:00Z")],
    ])("%s", (_, input, clock = now) => {
      expect(outcome(() => priceBasket(input, clock, rules))).toEqual(outcome(() => priceBasket(input, clock)));
    });

    it("prices every dessert type like the original engine", () => {
      for (const type of Object.keys(rules.dessertTypes!)) {
        const input = { desserts: [{ type, quantity: 30 }], delivery: false, eventDate: "2026-09-16" };
        expect(priceBasket(input, now, rules)).toEqual(priceBasket(input, now));
      }
    });
  });

  it("reproduces every PRD Appendix A price", () => {
    const now = new Date("2026-09-14T12:00:00+02:00");
    const tenInch = (flavour: string) => {
      const group = resolveFlavour(catalogue, flavour);
      if (!group.ok) throw new Error(group.code);
      return quote({ flavourGroup: group.value, tierSizes: [10], addons: [], delivery: false, eventDate: "2026-09-22" }, now, rules.cake).cake;
    };
    const prd = {
      vanilla: 1300, chocolate: 1300, chocolate_mint: 1300, lemon: 1300, banana_cinnamon: 1300,
      vanilla_caramel: 1400, lemon_blueberry: 1400, cookies_and_cream: 1400, carrot_cake: 1400, blueberry_and_orange: 1400, apple_spice: 1400, black_forest: 1400,
      traditional_fruit_cake: 2000,
      vegan_vanilla: 1700, vegan_chocolate: 1700, vegan_carrot: 1700, diabetic_lemon: 1700, diabetic_carrot_banana: 1700, diabetic_traditional_fruit_cake: 1700,
    };
    expect(Object.fromEntries(catalogue.flavours.map(f => [f.key, tenInch(f.key)]))).toEqual(prd);
    expect(rules.cake.addonPrices).toEqual({ chocolate_drip: 0, edible_print: 100, gloss_print: 75, message_topper: 100 });
    expect(Object.fromEntries(Object.entries(rules.dessertTypes!).map(([key, d]) => [key, d.price]))).toEqual(Object.fromEntries(catalogue.dessertTypes.map(d => [d.key, 30])));
    expect(rules.minimumDessertQuantity).toBe(30);
  });
});

describe("toPricingRules after owner edits", () => {
  const now = new Date("2026-09-14T12:00:00+02:00");
  const cake = { flavourGroup: "classic", tierSizes: [10], addons: [], delivery: false, eventDate: "2026-09-22" };
  const edit = (changes: Partial<Catalogue>) => buildCatalogue({ ...catalogue, ...changes }, true);

  it("prices a classic 10-inch cake at a changed K1,500 base", () => {
    const edited = edit({ flavourGroups: catalogue.flavourGroups.map(g => g.key === "classic" ? { ...g, basePrice: 1500 } : g) });
    expect(quote(cake, now, toPricingRules(edited).cake).cake).toBe(1500);
  });

  it("takes the tier limit from the setting", () => {
    const fourTiers = toPricingRules(edit({ settings: resolveSettings([{ key: "max_tiers", value: 4 }]) })).cake;
    expect(quote({ ...cake, tierSizes: [8, 10, 12, 14] }, now, fourTiers).cake).toBe(5772);
    expect(() => quote({ ...cake, tierSizes: [8, 10, 12, 14, 16] }, now, fourTiers)).toThrow("1-4 tiers");
    expect(() => quote({ ...cake, tierSizes: [8, 10, 12, 14] }, now, rules.cake)).toThrow("1-3 tiers");
  });

  it("excludes inactive items", () => {
    const hidden = toPricingRules(edit({
      flavourGroups: catalogue.flavourGroups.map(g => g.key === "fruit" ? { ...g, active: false } : g),
      sizes: catalogue.sizes.map(s => s.size === 16 ? { ...s, active: false } : s),
      addons: catalogue.addons.map(a => a.key === "gloss_print" ? { ...a, active: false } : a),
      dessertTypes: catalogue.dessertTypes.map(d => d.key === "brownies" ? { ...d, active: false } : d),
    }));
    expect(Object.keys(hidden.cake.flavourPrices)).not.toContain("fruit");
    expect(() => quote({ ...cake, flavourGroup: "fruit" }, now, hidden.cake)).toThrow("flavour");
    expect(() => quote({ ...cake, tierSizes: [16] }, now, hidden.cake)).toThrow("tier size");
    expect(() => quote({ ...cake, addons: ["gloss_print"] }, now, hidden.cake)).toThrow("add-on");
    const brownies = { desserts: [{ type: "brownies", quantity: 30 }], delivery: false, eventDate: "2026-09-22" };
    expect(() => priceBasket(brownies, now, hidden)).toThrow(expect.objectContaining({ code: "UNKNOWN_DESSERT" }));
    expect(() => priceBasket({ ...brownies, cake: { flavourGroup: "fruit", tierSizes: [10], addons: [] }, desserts: [] }, now, hidden)).toThrow(expect.objectContaining({ code: "INVALID_CAKE" }));
    expect(priceBasket({ ...brownies, desserts: [{ type: "cupcakes", quantity: 30 }] }, now, hidden).total).toBe(900);
  });

  it("uses edited fees and rates from settings", () => {
    const edited = toPricingRules(edit({ settings: resolveSettings([
      { key: "delivery_fee", value: 200 }, { key: "rush_rate_percent", value: 25 }, { key: "rush_window_hours", value: 24 },
      { key: "dessert_surcharge_percent", value: 10 }, { key: "dessert_min_quantity", value: 12 }, { key: "dessert_lead_days", value: 3 },
    ]) }));
    expect(quote({ ...cake, delivery: true }, now, edited.cake)).toMatchObject({ delivery: 200, rushFee: 0 });
    expect(quote({ ...cake, eventDate: "2026-09-15" }, now, edited.cake).rushFee).toBe(325);
    expect(quote({ ...cake, eventDate: "2026-09-16" }, now, edited.cake).rushFee).toBe(0);
    const desserts = { desserts: [{ type: "cupcakes", quantity: 12 }], delivery: true, eventDate: "2026-09-18" };
    expect(priceBasket(desserts, now, edited).total).toBe(560);
    expect(priceBasket({ ...desserts, cake: { flavourGroup: "classic", tierSizes: [10], addons: [] }, eventDate: "2026-09-16" }, now, edited).lines.find(l => l.kind === "dessert_surcharge")?.amount).toBe(36);
  });
});

describe("review fixes", () => {
  const now = new Date("2026-09-14T12:00:00+02:00");
  const edit = (changes: Partial<Catalogue>) => toPricingRules(buildCatalogue({ ...catalogue, ...changes }, true));
  const withSettings = (values: Record<string, unknown>) => edit({ settings: resolveSettings(Object.entries(values).map(([key, value]) => ({ key, value }))) });
  const classicAt = (basePrice: number, rushRatePercent: number) => edit({
    flavourGroups: catalogue.flavourGroups.map(g => g.key === "classic" ? { ...g, basePrice } : g),
    settings: resolveSettings([{ key: "rush_rate_percent", value: rushRatePercent }]),
  });
  const rushCake = { cake: { flavourGroup: "classic", tierSizes: [16], addons: [] }, delivery: false, eventDate: "2026-09-16" };

  it.each([
    [1350, 15, 35033, 2686, 1343],
    [1301, 20, 45015, 2701, 1350],
  ])("rounds the rush fee to whole hundredths for K%i at %i%%", (basePrice, rate, rushHundredths, total, deposit) => {
    const result = priceBasket(rushCake, now, classicAt(basePrice, rate));
    expect(result.lines.find(l => l.kind === "rush")?.amountHundredths).toBe(rushHundredths);
    expect(result.lines.every(l => Number.isSafeInteger(l.amountHundredths))).toBe(true);
    expect(result).toMatchObject({ total, deposit });
  });

  it("reports an out-of-range amount as a PricingError", () => {
    const huge = edit({ dessertTypes: catalogue.dessertTypes.map(d => ({ ...d, price: 1_000_000_000 })), settings: resolveSettings([{ key: "dessert_surcharge_percent", value: 200 }]) });
    const basket = { ...rushCake, desserts: [{ type: "cupcakes", quantity: 30 }] };
    expect(() => priceBasket(basket, now, huge)).toThrow(PricingError);
    expect(() => priceBasket(basket, now, huge)).toThrow(expect.objectContaining({ code: "AMOUNT_OUT_OF_RANGE" }));
  });

  it("uses the configured dessert lead time in earliestEventDate, agreeing with priceBasket", () => {
    const lead7 = withSettings({ dessert_lead_days: 7 });
    const earliest = earliestEventDate(false, now, lead7);
    expect(earliest).toBe("2026-09-22");
    expect(earliestEventDate(false, now)).toBe("2026-09-20");
    const desserts = { desserts: [{ type: "cupcakes", quantity: 30 }], delivery: false };
    expect(priceBasket({ ...desserts, eventDate: earliest }, now, lead7).total).toBe(900);
    expect(() => priceBasket({ ...desserts, eventDate: "2026-09-21" }, now, lead7)).toThrow(expect.objectContaining({ code: "DESSERT_LEAD_TIME" }));
  });

  it("uses the configured rush window in isCakeRushDate, agreeing with priceBasket", () => {
    const window72 = withSettings({ rush_window_hours: 72 });
    for (const eventDate of ["2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"]) {
      const rushed = priceBasket({ ...rushCake, eventDate }, now, window72).lines.some(l => l.kind === "rush");
      expect(isCakeRushDate(eventDate, now, window72)).toBe(rushed);
    }
    expect(isCakeRushDate("2026-09-17", now, window72)).toBe(true);
    expect(isCakeRushDate("2026-09-17", now)).toBe(false);
  });

  it("labels add-on lines with the catalogue name", () => {
    const renamed = edit({ addons: catalogue.addons.map(a => a.key === "gloss_print" ? { ...a, name: "Gloss photo print" } : a) });
    const lines = quote({ flavourGroup: "classic", tierSizes: [10], addons: ["gloss_print", "edible_print"], delivery: false, eventDate: "2026-09-22" }, now, renamed.cake).lines;
    expect(lines.filter(l => l.kind === "addon").map(l => l.label)).toEqual(["Gloss photo print", "Edible print"]);
    expect(quote({ flavourGroup: "classic", tierSizes: [10], addons: ["gloss_print"], delivery: false, eventDate: "2026-09-22" }, now).lines[1].label).toBe("gloss print");
  });
});

describe("K0 add-ons", () => {
  const now = new Date("2026-09-14T12:00:00+02:00");
  it("prices chocolate drip as a K0 line without changing totals or the deposit", () => {
    const cake = { flavourGroup: "classic", tierSizes: [16], addons: [] as string[] };
    const basket = { cake, desserts: [{ type: "cupcakes", quantity: 30 }], delivery: true, eventDate: "2026-09-16" };
    const plain = priceBasket(basket, now, rules);
    const withDrip = priceBasket({ ...basket, cake: { ...cake, addons: ["chocolate_drip"] } }, now, rules);
    expect(withDrip.lines.filter(l => l.kind === "addon")).toEqual([{ kind: "addon", label: "Chocolate drip", quantity: 1, unitAmount: 0, amount: 0, amountHundredths: 0 }]);
    expect(withDrip.total).toBe(withDrip.lines.reduce((sum, l) => sum + l.amount, 0));
    expect(withDrip).toMatchObject({ total: plain.total, deposit: plain.deposit });
    expect(quote({ ...cake, addons: ["chocolate_drip"], delivery: false, eventDate: "2026-09-22" }, now, rules.cake)).toMatchObject({ addons: 0, total: 2249 });
  });

  it("still rejects a negative add-on price and a K0 flavour price", () => {
    expect(() => quote({ flavourGroup: "classic", tierSizes: [10], addons: [], delivery: false, eventDate: "2026-09-22" }, now, { ...rules.cake, addonPrices: { chocolate_drip: -1 } })).toThrow("pricing rules");
    expect(() => quote({ flavourGroup: "classic", tierSizes: [10], addons: [], delivery: false, eventDate: "2026-09-22" }, now, { ...rules.cake, flavourPrices: { classic: 0 } })).toThrow("pricing rules");
  });
});
