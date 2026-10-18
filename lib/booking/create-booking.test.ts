import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { closeDate } from "../availability/availability";
import { seedCatalogue } from "../catalogue/seed";
import { defaultCatalogue } from "../catalogue/catalogue";
import { createTestDb } from "../db/test-db";
import { orderLines, orders, flavours } from "../db/schema";
import { createBooking } from "./create-booking";

const NOW = new Date("2026-10-17T08:00:00Z");
let test: Awaited<ReturnType<typeof createTestDb>>;

beforeEach(async () => {
  test = await createTestDb();
  await seedCatalogue(test.db);
});
afterEach(async () => test.close());

function request(overrides: Record<string, unknown> = {}) {
  return {
    cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8], addons: [] },
    fulfilment: "pickup",
    eventDate: "2026-11-30",
    timeWindow: "afternoon",
    name: "Mwila Banda",
    phone: "0977 123 456",
    email: "mwila@example.com",
    ...overrides,
  };
}

it("collects required and phone errors and rejects an empty basket", async () => {
  const invalid = await createBooking(test.db, request({ name: "", phone: "12345" }), NOW);
  expect(invalid).toMatchObject({ ok: false, errors: { name: "REQUIRED", phone: "PHONE_INVALID" } });
  expect(await createBooking(test.db, request({ cake: undefined }), NOW)).toMatchObject({ ok: false, errors: { _form: "EMPTY_BASKET" } });
});

it("requires a delivery address and normalises a valid Zambian mobile", async () => {
  expect(await createBooking(test.db, request({ fulfilment: "delivery", address: " " }), NOW))
    .toMatchObject({ ok: false, errors: { address: "DELIVERY_ADDRESS_REQUIRED" } });
  const result = await createBooking(test.db, request(), NOW);
  expect(result.ok).toBe(true);
  expect((await test.db.select().from(orders))[0].customerPhone).toBe("+260977123456");
});

it("ignores a client total and stores the server price", async () => {
  const result = await createBooking(test.db, request({ total: 1, deposit: 0 }), NOW);
  expect(result).toMatchObject({ ok: true, total: 1040, deposit: 520 });
  expect((await test.db.select().from(orders))[0]).toMatchObject({ total: 1040, deposit: 520 });
});

it("rejects inactive catalogue items without creating an order", async () => {
  await test.db.update(flavours).set({ active: false }).where(eq(flavours.key, "vanilla"));
  expect(await createBooking(test.db, request(), NOW)).toMatchObject({ ok: false, errors: { flavour: "INACTIVE_ITEM" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("enforces dessert lead time and the closed-date decision", async () => {
  expect(await createBooking(test.db, request({ cake: undefined, desserts: [{ type: "cupcakes", quantity: 30 }], eventDate: "2026-10-20" }), NOW))
    .toMatchObject({ ok: false, errors: { eventDate: "DATE_TOO_SOON" } });
  await closeDate(test.db, "2026-11-30", "manual", "Holiday", NOW);
  expect(await createBooking(test.db, request(), NOW)).toMatchObject({ ok: false, errors: { eventDate: "DATE_UNAVAILABLE" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("locks a cake rush fee into the stored order and returns configured payment instructions", async () => {
  const result = await createBooking(test.db, request({ eventDate: "2026-10-18" }), new Date("2026-10-17T13:00:00Z"));
  expect(result).toMatchObject({
    ok: true,
    paymentInstructions: { airtelNumber: "+260776597882", mtnNumber: "+260966222440", quote: expect.stringMatching(/^CAKE-2026-/) },
  });
  expect((await test.db.select().from(orderLines)).map(line => line.kind)).toContain("rush");
});

it("de-duplicates add-ons before pricing and persisting metadata", async () => {
  const result = await createBooking(test.db, request({ cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8], addons: ["message_topper", "message_topper", "edible_print"] }, topperMessage: "Happy birthday" }), NOW);
  expect(result.ok).toBe(true);
  const addonLines = (await test.db.select().from(orderLines)).filter(line => line.kind === "addon");
  expect(addonLines.map(line => line.meta.key)).toEqual(["message_topper", "edible_print"]);
});

it("accepts all 11 seeded dessert types and rejects duplicate types and more than 50 lines", async () => {
  const allDesserts = defaultCatalogue().dessertTypes.map(({ key }) => ({ type: key, quantity: 30 }));
  expect(allDesserts).toHaveLength(11);
  const accepted = await createBooking(test.db, request({ cake: undefined, desserts: allDesserts }), NOW);
  expect(accepted).toMatchObject({ ok: true, total: expect.any(Number), lines: expect.any(Array) });
  if (accepted.ok) expect(accepted.lines.filter(line => line.kind === "dessert")).toHaveLength(11);

  expect(await createBooking(test.db, request({ cake: undefined, desserts: [
    { type: "brownies", quantity: 30 }, { type: "brownies", quantity: 60 },
  ] }), NOW)).toMatchObject({ ok: false, errors: { desserts: "DUPLICATE_DESSERT" } });
  expect(await createBooking(test.db, request({ cake: undefined, desserts: Array.from({ length: 51 }, (_, i) => ({ type: `dessert-${i}`, quantity: 30 })) }), NOW))
    .toMatchObject({ ok: false, errors: { desserts: "TOO_MANY_DESSERT_LINES" } });
});

it("uses the configured tier maximum", async () => {
  const result = await createBooking(test.db, request({ cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8, 8, 8, 8], addons: [] } }), NOW);
  expect(result).toMatchObject({ ok: false, errors: { tierSizes: "TOO_MANY_TIERS" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("rejects over-limit tiers and invalid email before writing", async () => {
  expect(await createBooking(test.db, request({ cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8, 8, 8, 8], addons: [] } }), NOW))
    .toMatchObject({ ok: false, errors: { tierSizes: "TOO_MANY_TIERS" } });
  expect(await createBooking(test.db, request({ email: "bad" }), NOW)).toMatchObject({ ok: false, errors: { email: "EMAIL_INVALID" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("rejects a filled honeypot without writing an order", async () => {
  expect(await createBooking(test.db, request({ honeypot: "https://spam.example" }), NOW))
    .toMatchObject({ ok: false, errors: { _form: "INVALID_INPUT" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("accepts more than ten valid submissions without an IP-based limit", async () => {
  const results = await Promise.all(Array.from({ length: 11 }, () => createBooking(test.db, request(), NOW)));
  expect(results.every(result => result.ok)).toBe(true);
  expect(await test.db.select().from(orders)).toHaveLength(11);
});

it("rejects a dessert quantity whose priced amount exceeds safe integer range", async () => {
  const result = await createBooking(test.db, request({ cake: undefined, desserts: [{ type: "cupcakes", quantity: 4_000_000_000_000 }] }), NOW);
  expect(result).toMatchObject({ ok: false, errors: { desserts: "DESSERT_MIN_QUANTITY" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});

it("rejects an aggregate dessert subtotal that exceeds safe integer range", async () => {
  const result = await createBooking(test.db, request({ cake: undefined, desserts: [
    { type: "cupcakes", quantity: 1_510_000_000_000 },
    { type: "brownies", quantity: 1_510_000_000_000 },
  ] }), NOW);
  expect(result).toMatchObject({ ok: false, errors: { desserts: "INVALID_INPUT" } });
  expect(await test.db.select().from(orders)).toEqual([]);
});
