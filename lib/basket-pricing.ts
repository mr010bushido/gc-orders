import { quote, type PricingLine, type QuoteInput } from "./pricing";

const DAY = 24 * 60 * 60 * 1000;
const LUSAKA_OFFSET = 2 * 60 * 60 * 1000;
const DESSERTS = {
  cupcakes: "Assorted cupcakes",
  brownies: "Brownies",
  lemon_bars: "Lemon bars",
  cake_cups: "Cake cups",
  cheesecake_cups: "Cheesecake cups",
  chocolate_mousse: "Chocolate mousse",
  trifle_in_a_cup: "Trifle in a cup",
  coconut_balls: "Coconut balls",
  milk_tart: "Milk tart",
  apple_crumble: "Apple crumble",
  cake_pops: "Cake pops",
};

type PricingErrorCode = "EMPTY_BASKET" | "INVALID_CAKE" | "UNKNOWN_DESSERT" | "DESSERT_MIN_QUANTITY" | "DESSERT_LEAD_TIME" | "INVALID_QUOTE_LINE" | "INVALID_DATE";

export class PricingError extends RangeError {
  constructor(public readonly code: PricingErrorCode, message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export type BasketInput = {
  cake?: Omit<QuoteInput, "eventDate" | "delivery">;
  desserts?: readonly { type: string; quantity: number; note?: string }[];
  quoteLines?: readonly { label: string; amount: number }[];
  delivery: boolean;
  eventDate: string;
};

export type PricingRules = {
  dessertUnitPrice: number;
  minimumDessertQuantity: number;
  dessertLeadTimeDays: number;
  dessertSurchargeBasisPoints: number;
  deliveryFee: number;
};

export const DEFAULT_RULES: Readonly<PricingRules> = Object.freeze({
  dessertUnitPrice: 30,
  minimumDessertQuantity: 30,
  dessertLeadTimeDays: 5,
  dessertSurchargeBasisPoints: 2000,
  deliveryFee: 150,
});

function nowInstant(now: Date): number {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new PricingError("INVALID_DATE", "now must be a valid instant");
  }
  return now.getTime();
}

function eventMidnight(date: string, now: Date): number {
  const instant = nowInstant(now);
  const eventUtc = Date.parse(`${date}T00:00:00Z`);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(eventUtc) || new Date(eventUtc).toISOString().slice(0, 10) !== date) {
    throw new PricingError("INVALID_DATE", "event date must be a valid YYYY-MM-DD calendar date");
  }
  const today = new Date(instant + LUSAKA_OFFSET).toISOString().slice(0, 10);
  if (date <= today) {
    throw new PricingError("INVALID_DATE", "event date must be in the future in Lusaka");
  }
  return eventUtc - LUSAKA_OFFSET;
}

export function earliestEventDate(hasCake: boolean, now: Date): string {
  if (typeof hasCake !== "boolean") {
    throw new TypeError("hasCake must be a boolean");
  }
  const localInstant = nowInstant(now) + LUSAKA_OFFSET;
  const firstDay = hasCake
    ? Math.floor(localInstant / DAY) + 1
    : Math.ceil((localInstant + DEFAULT_RULES.dessertLeadTimeDays * DAY) / DAY);
  const firstDate = new Date(firstDay * DAY);
  if (!Number.isFinite(firstDate.getTime())) {
    throw new PricingError("INVALID_DATE", "earliest event date is outside the calendar range");
  }
  const date = firstDate.toISOString().slice(0, 10);
  eventMidnight(date, now);
  return date;
}

export function isCakeRushDate(date: string, now: Date): boolean {
  return eventMidnight(date, now) - now.getTime() < 2 * DAY;
}

function safeHundredths(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER - 100) {
    throw new RangeError("amount exceeds safe integer hundredths");
  }
  return amount;
}

function line(kind: PricingLine["kind"], label: string, amountHundredths: number, quantity = 1): PricingLine {
  safeHundredths(amountHundredths);
  return {
    kind,
    label,
    quantity,
    unitAmount: Math.floor((amountHundredths / quantity + 50) / 100),
    amount: Math.floor((amountHundredths + 50) / 100),
    amountHundredths,
  };
}

export function priceBasket(input: BasketInput, now: Date, rules = DEFAULT_RULES): { lines: PricingLine[]; total: number; deposit: number } {
  if (!input || typeof input !== "object" || typeof input.delivery !== "boolean") {
    throw new TypeError("basket must be an object with a boolean delivery choice");
  }
  if (!rules || Object.keys(DEFAULT_RULES).some(key => !Number.isSafeInteger(rules[key as keyof PricingRules]) || rules[key as keyof PricingRules] < 0) || !(rules.dessertUnitPrice > 0) || !(rules.minimumDessertQuantity > 0)) {
    throw new RangeError("pricing rules must contain nonnegative safe integers and positive dessert price and minimum");
  }
  safeHundredths(rules.deliveryFee * 100);
  safeHundredths(rules.dessertLeadTimeDays * DAY);
  const desserts = input.desserts === undefined ? [] : input.desserts;
  const quoteLines = input.quoteLines === undefined ? [] : input.quoteLines;
  if (!Array.isArray(desserts)) {
    throw new PricingError("UNKNOWN_DESSERT", "desserts must be an array");
  }
  if (!Array.isArray(quoteLines)) {
    throw new PricingError("INVALID_QUOTE_LINE", "quote lines must be an array");
  }
  if (input.cake === undefined && desserts.length === 0 && quoteLines.length === 0) {
    throw new PricingError("EMPTY_BASKET", "a basket needs at least one item");
  }

  const lines: PricingLine[] = [];
  let eventInstant: number;
  if (input.cake !== undefined) {
    try {
      if (!input.cake || typeof input.cake !== "object") {
        throw new TypeError("cake must be an object");
      }
      const cakeQuote = quote({ ...input.cake, eventDate: input.eventDate, delivery: false }, now);
      lines.push(...cakeQuote.lines);
      eventInstant = Date.parse(`${input.eventDate}T00:00:00+02:00`);
    } catch (error) {
      throw new PricingError("INVALID_CAKE", error instanceof Error ? error.message : "invalid cake");
    }
  } else {
    eventInstant = eventMidnight(input.eventDate, now);
  }

  let dessertHundredths = 0;
  for (const dessert of desserts) {
    if (!dessert || typeof dessert.type !== "string" || !Object.hasOwn(DESSERTS, dessert.type)) {
      throw new PricingError("UNKNOWN_DESSERT", "unknown dessert type");
    }
    if (!Number.isSafeInteger(dessert.quantity) || dessert.quantity < rules.minimumDessertQuantity || !Number.isSafeInteger(dessert.quantity * rules.dessertUnitPrice * 100)) {
      throw new PricingError("DESSERT_MIN_QUANTITY", "dessert quantity must meet the minimum and produce a safe whole-piece amount");
    }
    if (dessert.note !== undefined && typeof dessert.note !== "string") {
      throw new TypeError("dessert note must be text");
    }
    const amountHundredths = safeHundredths(dessert.quantity * rules.dessertUnitPrice * 100);
    dessertHundredths = safeHundredths(dessertHundredths + amountHundredths);
    lines.push(line("dessert", DESSERTS[dessert.type as keyof typeof DESSERTS], amountHundredths, dessert.quantity));
  }
  if (desserts.length > 0 && eventInstant - now.getTime() < rules.dessertLeadTimeDays * DAY) {
    if (input.cake === undefined) {
      throw new PricingError("DESSERT_LEAD_TIME", "dessert-only baskets need the configured lead time");
    }
    const surcharge = Math.round(safeHundredths(dessertHundredths * rules.dessertSurchargeBasisPoints) / 10000);
    if (surcharge > 0) {
      lines.push(line("dessert_surcharge", "Dessert short-notice surcharge", surcharge));
    }
  }
  if (input.delivery && rules.deliveryFee > 0) {
    lines.push(line("delivery", "Delivery", rules.deliveryFee * 100));
  }
  for (const quoteLine of quoteLines) {
    if (!quoteLine || typeof quoteLine.label !== "string" || quoteLine.label.trim().length === 0 || !Number.isSafeInteger(quoteLine.amount) || quoteLine.amount <= 0 || !Number.isSafeInteger(quoteLine.amount * 100)) {
      throw new PricingError("INVALID_QUOTE_LINE", "quote lines need a label and a positive safe whole-Kwacha amount");
    }
    lines.push(line("quote", quoteLine.label, quoteLine.amount * 100));
  }
  const totalHundredths = lines.reduce((sum, item) => safeHundredths(sum + item.amountHundredths), 0);
  return {
    lines,
    total: lines.reduce((sum, item) => sum + item.amount, 0),
    deposit: Math.floor((totalHundredths + 100) / 200),
  };
}
