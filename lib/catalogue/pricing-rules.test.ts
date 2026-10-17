import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, priceBasket, type BasketInput } from "../basket-pricing";
import { DEFAULT_CAKE_RULES, quote, type QuoteInput } from "../pricing";
import { defaultCatalogue } from "./catalogue";
import { resolveFlavour } from "./lookup";
import { toPricingRules } from "./pricing-rules";

const catalogue = defaultCatalogue();
const rules = toPricingRules(catalogue);

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
    expect(rules.cake).toEqual(DEFAULT_CAKE_RULES);
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
      expect(outcome(() => quote(input, clock, rules.cake))).toEqual(outcome(() => quote(input, clock)));
    });

    it("matches on every flavour group, tier combination, add-on set, delivery choice and date", () => {
      const sizes = [8, 10, 12, 14, 16];
      const tiers = [...sizes.map(a => [a]), ...sizes.flatMap(a => sizes.map(b => [a, b])), ...sizes.flatMap(a => sizes.flatMap(b => sizes.map(c => [a, b, c])))];
      const addonSets = [[], ["edible_print"], ["gloss_print"], ["message_topper"], ["edible_print", "gloss_print", "message_topper"]];
      let compared = 0;
      for (const flavourGroup of Object.keys(DEFAULT_CAKE_RULES.flavourPrices)) {
        for (const tierSizes of tiers) {
          for (const addons of addonSets) {
            for (const delivery of [false, true]) {
              for (const eventDate of ["2026-09-15", "2026-09-16", "2026-09-17"]) {
                const input = { flavourGroup, tierSizes, addons, delivery, eventDate };
                expect(quote(input, now, rules.cake)).toEqual(quote(input, now));
                compared++;
              }
            }
          }
        }
      }
      expect(compared).toBe(4 * 155 * 5 * 2 * 3);
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
    expect(rules.cake.addonPrices).toEqual({ edible_print: 100, gloss_print: 75, message_topper: 100 });
    expect(Object.fromEntries(Object.entries(rules.dessertTypes!).map(([key, d]) => [key, d.price]))).toEqual(Object.fromEntries(catalogue.dessertTypes.map(d => [d.key, 30])));
    expect(rules.minimumDessertQuantity).toBe(30);
  });
});
