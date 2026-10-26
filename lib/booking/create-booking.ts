import { earliestEventDate, priceBasket, PricingError } from "../basket-pricing";
import { assertDateOpen, AvailabilityError } from "../availability/availability";
import { getCatalogue } from "../catalogue/catalogue";
import { resolveAddon, resolveDessertType, resolveFlavour, resolveFrosting, resolveSize } from "../catalogue/lookup";
import { toPricingRules } from "../catalogue/pricing-rules";
import type { Db } from "../db";
import { quoteRequests } from "../db/schema";
import { normaliseZambianMobile } from "../phone";
import { createOrder, type CreateOrderInput } from "../orders/orders";
import { OrderError } from "../orders/orders";
import { bookingRequestSchema, type BookingErrorCode, type BookingField, type BookingResponse } from "./schema";

function fieldFor(path: PropertyKey[]): BookingField {
  const field = String(path[0] ?? "_form");
  if (field === "cake" && ["flavour", "frosting", "tierSizes", "addons"].includes(String(path[1]))) return String(path[1]) as BookingField;
  if (field === "quoteRequest") return "quoteDescription";
  return ["name", "phone", "email", "fulfilment", "address", "eventDate", "timeWindow", "designNotes", "topperMessage", "imageTokens", "cake", "desserts"].includes(field)
    ? field as BookingField : "_form";
}

function addError(errors: Partial<Record<BookingField, BookingErrorCode>>, field: BookingField, code: BookingErrorCode) {
  errors[field] ??= code;
}

function unsafeDessertSubtotal(desserts: { type: string; quantity: number }[], rules: ReturnType<typeof toPricingRules>): boolean {
  let subtotal = 0;
  for (const dessert of desserts) {
    const price = rules.dessertTypes?.[dessert.type]?.price;
    const minimum = rules.minimumDessertQuantity;
    if (!Number.isSafeInteger(price) || !price || price < 1 || !Number.isSafeInteger(minimum)
      || minimum < 1) return false;
    const minimumAmount = minimum * price * 100;
    if (!Number.isSafeInteger(minimumAmount) || minimumAmount > Number.MAX_SAFE_INTEGER - 100) return false;
    const amount = dessert.quantity * price * 100;
    if (!Number.isSafeInteger(amount) || amount > Number.MAX_SAFE_INTEGER - 100
      || subtotal > Number.MAX_SAFE_INTEGER - 100 - amount) return true;
    subtotal += amount;
  }
  return false;
}

/** Validates and prices an untrusted request, then writes the immutable order snapshot. */
export async function createBooking(db: Db, input: unknown, now: Date): Promise<BookingResponse> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<BookingField, BookingErrorCode>> = {};
    for (const issue of parsed.error.issues) {
      const field = fieldFor(issue.path);
      addError(errors, field, field === "phone" ? "PHONE_INVALID" : field === "email" ? "EMAIL_INVALID"
        : issue.message === "Duplicate dessert types" ? "DUPLICATE_DESSERT"
          : field === "desserts" && issue.path.length === 1 && issue.code === "too_big" ? "TOO_MANY_DESSERT_LINES"
        : field === "tierSizes" && issue.code === "too_big" ? "TOO_MANY_TIERS"
        : field === "imageTokens" && issue.code === "too_big" ? "TOO_MANY_IMAGES"
          : issue.path[0] === "quoteRequest" ? "REQUIRED"
          : issue.code === "invalid_type" || issue.code === "too_small" ? "REQUIRED" : "INVALID_INPUT");
    }
    if (input && typeof input === "object" && "phone" in input && typeof input.phone === "string" && !normaliseZambianMobile(input.phone)) {
      addError(errors, "phone", "PHONE_INVALID");
    }
    if (input && typeof input === "object" && "fulfilment" in input && input.fulfilment === "delivery"
      && (!('address' in input) || typeof input.address !== "string" || !input.address.trim())) {
      addError(errors, "address", "DELIVERY_ADDRESS_REQUIRED");
    }
    return { ok: false, errors };
  }

  const request = parsed.data;
  if (request.honeypot?.trim()) return { ok: false, errors: { _form: "INVALID_INPUT" } };
  const errors: Partial<Record<BookingField, BookingErrorCode>> = {};
  if (!request.cake && request.desserts.length === 0 && !request.quoteRequest) addError(errors, "_form", "EMPTY_BASKET");
  const phone = normaliseZambianMobile(request.phone);
  if (!phone) addError(errors, "phone", "PHONE_INVALID");
  if (request.fulfilment === "delivery" && !request.address?.trim()) addError(errors, "address", "DELIVERY_ADDRESS_REQUIRED");
  if (request.cake?.addons.includes("message_topper") && !request.topperMessage?.trim()) addError(errors, "topperMessage", "REQUIRED");

  const catalogue = await getCatalogue(db, { includeInactive: true });
  const flavour = request.cake && resolveFlavour(catalogue, request.cake.flavour);
  const frosting = request.cake && resolveFrosting(catalogue, request.cake.frosting);
  if (flavour && !flavour.ok) addError(errors, "flavour", flavour.code === "INACTIVE_ITEM" ? "INACTIVE_ITEM" : "INVALID_INPUT");
  if (frosting && !frosting.ok) addError(errors, "frosting", frosting.code === "INACTIVE_ITEM" ? "INACTIVE_ITEM" : "INVALID_INPUT");
  if (request.cake) {
    if (request.cake.tierSizes.length > catalogue.settings.max_tiers) addError(errors, "tierSizes", "TOO_MANY_TIERS");
    for (const size of request.cake.tierSizes) {
      const result = resolveSize(catalogue, size);
      if (!result.ok) addError(errors, "tierSizes", result.code === "INACTIVE_ITEM" ? "INACTIVE_ITEM" : "INVALID_INPUT");
    }
    for (const addon of request.cake.addons) {
      const result = resolveAddon(catalogue, addon);
      if (!result.ok) addError(errors, "addons", result.code === "INACTIVE_ITEM" ? "INACTIVE_ITEM" : "INVALID_INPUT");
    }
  }
  for (const dessert of request.desserts) {
    const result = resolveDessertType(catalogue, dessert.type);
    if (!result.ok) addError(errors, "desserts", result.code === "INACTIVE_ITEM" ? "INACTIVE_ITEM" : "INVALID_INPUT");
    if (dessert.quantity < catalogue.settings.dessert_min_quantity) addError(errors, "desserts", "DESSERT_MIN_QUANTITY");
  }

  const rules = toPricingRules(catalogue);
  if (request.eventDate < earliestEventDate(Boolean(request.cake || request.quoteRequest), now, rules)) addError(errors, "eventDate", "DATE_TOO_SOON");
  if (Object.keys(errors).length) return { ok: false, errors };

  const cake = request.cake;
  const selectedFlavour = cake ? catalogue.flavours.find(item => item.key === cake.flavour)! : undefined;
  const selectedFrosting = cake ? catalogue.frostings.find(item => item.key === cake.frosting)! : undefined;
  let priced;
  try {
    priced = !request.cake && request.desserts.length === 0 && request.quoteRequest
      ? { lines: [], total: 0, deposit: 0 }
      : priceBasket({
      ...(cake ? { cake: { flavourGroup: flavour?.ok ? flavour.value : "", tierSizes: cake.tierSizes, addons: cake.addons } } : {}),
      desserts: request.desserts,
      delivery: request.fulfilment === "delivery",
      eventDate: request.eventDate,
      }, now, rules);
  } catch (error) {
    if (!(error instanceof PricingError)) throw error;
    if (error.code === "DESSERT_MIN_QUANTITY" && unsafeDessertSubtotal(request.desserts, rules)) {
      return { ok: false, errors: { desserts: "DESSERT_MIN_QUANTITY" } };
    }
    if (error.code === "AMOUNT_OUT_OF_RANGE" && unsafeDessertSubtotal(request.desserts, rules)) {
      return { ok: false, errors: { desserts: "INVALID_INPUT" } };
    }
    throw error;
  }
  let dessertIndex = 0;
  let addonIndex = 0;
  const orderInput: CreateOrderInput = {
    customer: { name: request.name, phone: phone!, email: request.email },
    fulfilment: request.fulfilment,
    deliveryAddress: request.address,
    eventDate: request.eventDate,
    timeWindow: request.timeWindow,
    designNotes: request.designNotes,
    topperMessage: request.topperMessage,
    imageTokens: request.imageTokens,
    requestsQuote: Boolean(request.quoteRequest),
    basket: {
      total: priced.total,
      deposit: priced.deposit,
      lines: priced.lines.map(line => {
        let meta: Record<string, unknown> = {};
        if (line.kind === "cake" && cake && selectedFlavour && selectedFrosting) meta = {
          flavourKey: selectedFlavour.key, flavour: selectedFlavour.name, diet: selectedFlavour.diet,
          frostingKey: selectedFrosting.key, frosting: selectedFrosting.name, tiers: cake.tierSizes,
        };
        if (line.kind === "addon" && cake) meta = { key: cake.addons[addonIndex++] };
        if (line.kind === "dessert") {
          const dessert = request.desserts[dessertIndex++];
          meta = { type: dessert.type, ...(dessert.note ? { note: dessert.note } : {}) };
        }
        return { ...line, meta };
      }),
    },
  };

  try {
    const created = await db.transaction(async tx => {
      await assertDateOpen(tx, request.eventDate);
      const created = await createOrder(tx, orderInput, now);
      if (request.quoteRequest) await tx.insert(quoteRequests).values({ orderId: created.order.id, ...request.quoteRequest });
      return created;
    });
    return {
      ok: true,
      reference: created.order.reference,
      accessToken: created.accessToken,
      total: created.order.total,
      deposit: created.order.deposit,
      lines: priced.lines,
      paymentInstructions: {
        airtelNumber: catalogue.settings.airtel_number,
        mtnNumber: catalogue.settings.mtn_number,
        quote: created.order.reference,
      },
    };
  } catch (error) {
    if (error instanceof AvailabilityError) return { ok: false, errors: { eventDate: "DATE_UNAVAILABLE" } };
    if (error instanceof OrderError && error.code === "IMAGE_NOT_FOUND") return { ok: false, errors: { imageTokens: "IMAGE_NOT_FOUND" } };
    if (error instanceof PricingError) return { ok: false, errors: { eventDate: error.code === "DESSERT_LEAD_TIME" ? "DATE_TOO_SOON" : "INVALID_INPUT" } };
    throw error;
  }
}
