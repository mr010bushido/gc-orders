import { priceBasket } from "../basket-pricing";
import type { PricingRules } from "../basket-pricing";
import type { CreateOrderInput } from "./orders";

export const BOOKED_AT = new Date("2026-10-17T08:00:00Z");

/** Test input: a classic 8" vanilla cake for pickup, priced by `priceBasket` with the given rules. */
export function orderInput(overrides: Partial<CreateOrderInput> = {}, rules?: PricingRules): CreateOrderInput {
  const priced = priceBasket({ cake: { flavourGroup: "classic", tierSizes: [8], addons: [] }, delivery: false, eventDate: "2026-10-30" }, BOOKED_AT, rules);
  return {
    customer: { name: "Mwila Banda", phone: "0977 123 456", email: "mwila@example.com" },
    fulfilment: "pickup",
    eventDate: "2026-10-30",
    timeWindow: "afternoon",
    designNotes: "Pale blue with gold leaf",
    basket: {
      lines: priced.lines.map(line => ({
        ...line,
        meta: line.kind === "cake" ? { flavourKey: "vanilla", flavour: "Vanilla", diet: "standard", frostingKey: "buttercream", frosting: "Buttercream", tiers: [8] } : {},
      })),
      total: priced.total,
      deposit: priced.deposit,
    },
    ...overrides,
  };
}
