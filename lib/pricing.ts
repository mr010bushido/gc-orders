const LUSAKA_OFFSET = 2 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Price tables (whole Kwacha; size multipliers in hundredths) and rates. Built from the catalogue by `toPricingRules`. */
export type CakeRules = {
  flavourPrices: Readonly<Record<string, number>>;
  sizeMultipliers: Readonly<Record<number, number>>;
  addonPrices: Readonly<Record<string, number>>;
  /** Display names for add-on lines; a missing name falls back to the key with spaces. */
  addonNames?: Readonly<Record<string, string>>;
  deliveryFee: number;
  rushRatePercent: number;
  rushWindowHours: number;
  maxTiers: number;
};

export const DEFAULT_CAKE_RULES: Readonly<CakeRules> = Object.freeze({
  flavourPrices: Object.freeze({ classic: 1300, signature: 1400, fruit: 2000, vegan_diabetic: 1700 }),
  sizeMultipliers: Object.freeze({ 8: 80, 10: 100, 12: 120, 14: 144, 16: 173 }),
  addonPrices: Object.freeze({ edible_print: 100, gloss_print: 75, message_topper: 100 }),
  deliveryFee: 150,
  rushRatePercent: 20,
  rushWindowHours: 48,
  maxTiers: 3,
});

export type QuoteInput = {
  flavourGroup: string;
  tierSizes: readonly number[];
  addons: readonly string[];
  delivery: boolean;
  eventDate: string;
};

function checkRules(rules: CakeRules) {
  const amount = (value: unknown, min: number) => Number.isSafeInteger(value) && (value as number) >= min;
  const table = (value: unknown) => !!value && typeof value === "object" && Object.values(value).every(price => amount(price, 1));
  if (!rules || !table(rules.flavourPrices) || !table(rules.sizeMultipliers) || !table(rules.addonPrices)
    || !amount(rules.deliveryFee, 0) || !amount(rules.rushRatePercent, 0) || !amount(rules.rushWindowHours, 0) || !amount(rules.maxTiers, 1)
    || !Number.isSafeInteger(rules.rushWindowHours * HOUR)
    || (rules.addonNames !== undefined && (!rules.addonNames || typeof rules.addonNames !== "object" || Object.values(rules.addonNames).some(name => typeof name !== "string")))) {
    throw new RangeError("pricing rules need positive safe integer prices and nonnegative safe integer rates");
  }
}

export type PricingLine = {
  kind: "cake" | "rush" | "addon" | "dessert" | "dessert_surcharge" | "delivery" | "quote";
  label: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  amountHundredths: number;
};

export type Quote = {
  cake: number;
  rushFee: number;
  addons: number;
  delivery: number;
  total: number;
  deposit: number;
  lines: PricingLine[];
};

export function quote(input: QuoteInput, now: Date, rules: CakeRules = DEFAULT_CAKE_RULES): Quote {
  checkRules(rules);
  const { flavourPrices, sizeMultipliers, addonPrices } = rules;
  const tierSizes = input.tierSizes;
  const selectedAddons = input.addons;
  if (!Array.isArray(input.tierSizes) || input.tierSizes.length < 1 || input.tierSizes.length > rules.maxTiers) {
    throw new RangeError(`a cake needs 1-${rules.maxTiers} tiers`);
  }
  if (typeof input.flavourGroup !== "string" || !Object.hasOwn(flavourPrices, input.flavourGroup)) {
    throw new RangeError("unknown flavour group");
  }
  if ([...input.tierSizes].some((size) => typeof size !== "number" || !Object.hasOwn(sizeMultipliers, size))) {
    throw new RangeError("unknown tier size");
  }
  if (!Array.isArray(input.addons) || input.addons.some((addon) => typeof addon !== "string" || !Object.hasOwn(addonPrices, addon))) {
    throw new RangeError("unknown add-on");
  }
  if (typeof input.delivery !== "boolean") {
    throw new TypeError("delivery must be a boolean");
  }
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("now must be a valid instant");
  }

  const eventUtc = Date.parse(`${input.eventDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) || !Number.isFinite(eventUtc) || new Date(eventUtc).toISOString().slice(0, 10) !== input.eventDate) {
    throw new RangeError("event date must be a valid YYYY-MM-DD calendar date");
  }
  const today = new Date(now.getTime() + LUSAKA_OFFSET).toISOString().slice(0, 10);
  if (input.eventDate <= today) {
    throw new RangeError("event date must be in the future in Lusaka");
  }

  const multiplier = tierSizes.reduce((sum, size) => sum + sizeMultipliers[size], 0);
  const cakeHundredths = flavourPrices[input.flavourGroup] * multiplier;
  const isRush = eventUtc - LUSAKA_OFFSET - now.getTime() < rules.rushWindowHours * HOUR;
  // Whole hundredths, half-up, so edited prices and rates never produce fractional line amounts.
  const rushHundredths = isRush ? Math.floor((cakeHundredths * rules.rushRatePercent + 50) / 100) : 0;
  const addons = [...new Set(selectedAddons)].reduce((sum, addon) => sum + addonPrices[addon], 0);
  const delivery = input.delivery ? rules.deliveryFee : 0;
  const totalHundredths = cakeHundredths + rushHundredths + (addons + delivery) * 100;
  if (!Number.isSafeInteger(cakeHundredths * rules.rushRatePercent + 50) || !Number.isSafeInteger(totalHundredths + 100)) {
    throw new RangeError("quote exceeds safe integer hundredths");
  }
  const cake = Math.floor((cakeHundredths + 50) / 100);
  const rushFee = Math.floor((rushHundredths + 50) / 100);
  const lines: PricingLine[] = [
    { kind: "cake", label: "Cake", quantity: 1, unitAmount: cake, amount: cake, amountHundredths: cakeHundredths },
  ];
  if (rushFee > 0) {
    lines.push({ kind: "rush", label: "Cake rush", quantity: 1, unitAmount: rushFee, amount: rushFee, amountHundredths: rushHundredths });
  }
  for (const addon of new Set(selectedAddons)) {
    const label = rules.addonNames && Object.hasOwn(rules.addonNames, addon) ? rules.addonNames[addon] : addon.replaceAll("_", " ");
    lines.push({ kind: "addon", label, quantity: 1, unitAmount: addonPrices[addon], amount: addonPrices[addon], amountHundredths: addonPrices[addon] * 100 });
  }
  if (delivery > 0) {
    lines.push({ kind: "delivery", label: "Delivery", quantity: 1, unitAmount: delivery, amount: delivery, amountHundredths: delivery * 100 });
  }

  return {
    cake,
    rushFee,
    addons,
    delivery,
    total: Math.floor((totalHundredths + 50) / 100),
    deposit: Math.floor((totalHundredths + 100) / 200),
    lines,
  };
}
