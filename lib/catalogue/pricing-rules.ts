import { DEFAULT_RULES, type PricingRules } from "../basket-pricing";
import type { CakeRules } from "../pricing";
import { buildCatalogue, type Catalogue } from "./catalogue";

/** Rules for `quote()` (`rules.cake`) and `priceBasket()` (`rules`), built from active catalogue items only. */
export function toPricingRules(catalogue: Catalogue): PricingRules & { cake: CakeRules } {
  const active = buildCatalogue(catalogue, false);
  const s = active.settings;
  const cake: CakeRules = {
    flavourPrices: Object.fromEntries(active.flavourGroups.map(g => [g.key, g.basePrice])),
    sizeMultipliers: Object.fromEntries(active.sizes.map(size => [size.size, size.multiplier])),
    addonPrices: Object.fromEntries(active.addons.map(a => [a.key, a.price])),
    deliveryFee: s.delivery_fee,
    rushRatePercent: s.rush_rate_percent,
    rushWindowHours: s.rush_window_hours,
    maxTiers: s.max_tiers,
  };
  const dessertTypes = Object.fromEntries(active.dessertTypes.map(d => [d.key, { name: d.name, price: d.price }]));
  return Object.freeze({
    dessertUnitPrice: DEFAULT_RULES.dessertUnitPrice, // ignored: `dessertTypes` carries per-type prices
    minimumDessertQuantity: s.dessert_min_quantity,
    dessertLeadTimeDays: s.dessert_lead_days,
    dessertSurchargeBasisPoints: s.dessert_surcharge_percent * 100,
    deliveryFee: s.delivery_fee,
    dessertTypes,
    cake,
  });
}
