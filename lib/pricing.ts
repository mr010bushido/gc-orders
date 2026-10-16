const FLAVOUR_PRICE = { classic: 1300, signature: 1400, fruit: 2000, vegan_diabetic: 1700 };
const SIZE_MULTIPLIER = { 8: 80, 10: 100, 12: 120, 14: 144, 16: 173 };
const ADDON_PRICE = { edible_print: 100, gloss_print: 75, message_topper: 100 };
const LUSAKA_OFFSET = 2 * 60 * 60 * 1000;
const RUSH_WINDOW = 48 * 60 * 60 * 1000;

export type QuoteInput = {
  flavourGroup: keyof typeof FLAVOUR_PRICE;
  tierSizes: readonly (keyof typeof SIZE_MULTIPLIER)[];
  addons: readonly (keyof typeof ADDON_PRICE)[];
  delivery: boolean;
  eventDate: string;
};

export type Quote = {
  cake: number;
  rushFee: number;
  addons: number;
  delivery: number;
  total: number;
  deposit: number;
};

export function quote(input: QuoteInput, now: Date): Quote {
  const tierSizes = input.tierSizes;
  const selectedAddons = input.addons;
  if (!Array.isArray(input.tierSizes) || input.tierSizes.length < 1 || input.tierSizes.length > 3) {
    throw new RangeError("a cake needs 1-3 tiers");
  }
  if (!Object.hasOwn(FLAVOUR_PRICE, input.flavourGroup)) {
    throw new RangeError("unknown flavour group");
  }
  if (input.tierSizes.some((size) => typeof size !== "number" || !Object.hasOwn(SIZE_MULTIPLIER, size))) {
    throw new RangeError("unknown tier size");
  }
  if (!Array.isArray(input.addons) || input.addons.some((addon) => !Object.hasOwn(ADDON_PRICE, addon))) {
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

  const multiplier = tierSizes.reduce((sum, size) => sum + SIZE_MULTIPLIER[size], 0);
  const cakeHundredths = FLAVOUR_PRICE[input.flavourGroup] * multiplier;
  const rushHundredths = eventUtc - LUSAKA_OFFSET - now.getTime() < RUSH_WINDOW ? cakeHundredths / 5 : 0;
  const addons = [...new Set(selectedAddons)].reduce((sum, addon) => sum + ADDON_PRICE[addon], 0);
  const delivery = input.delivery ? 150 : 0;
  const totalHundredths = cakeHundredths + rushHundredths + (addons + delivery) * 100;

  return {
    cake: Math.floor((cakeHundredths + 50) / 100),
    rushFee: Math.floor((rushHundredths + 50) / 100),
    addons,
    delivery,
    total: Math.floor((totalHundredths + 50) / 100),
    deposit: Math.floor((totalHundredths + 100) / 200),
  };
}
