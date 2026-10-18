import { createHash } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, expect, it } from "vitest";
import { priceBasket } from "../basket-pricing";
import { getCatalogue } from "../catalogue/catalogue";
import { toPricingRules } from "../catalogue/pricing-rules";
import { seedCatalogue } from "../catalogue/seed";
import { flavourGroups, orderLines, orders, orderStatusEvents, referenceCounters, settings } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder, getOrder, OrderError } from "./orders";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); });
afterEach(async () => { await test.close(); });

const counts = async () => Object.fromEntries(await Promise.all(([["orders", orders], ["lines", orderLines], ["events", orderStatusEvents], ["counters", referenceCounters]] as const)
  .map(async ([name, table]) => [name, (await test.db.select({ n: count() }).from(table))[0].n])));

it("stores the order, snapshot lines, first event, reference, token hash and deadline", async () => {
  const { order, lines, accessToken } = await createOrder(test.db, orderInput(), new Date("2026-10-17T08:00:00Z"));
  expect(order).toMatchObject({
    reference: "CAKE-2026-0001", status: "awaiting_payment", customerPhone: "+260977123456", total: 1040, deposit: 520,
    deliveryAddress: "", topperMessage: "", designNotes: "Pale blue with gold leaf", ownerSeenAt: null,
    paymentDueAt: new Date("2026-10-18T08:00:00Z"),
  });
  expect(lines).toMatchObject([{ position: 0, kind: "cake", label: "Cake", quantity: 1, unitAmount: 1040, amount: 1040, meta: { flavour: "Vanilla", tiers: [8] } }]);
  expect(accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(order.accessTokenHash).toBe(createHash("sha256").update(accessToken).digest("hex"));
  const raw = await test.client.query("select * from orders");
  expect(JSON.stringify(raw.rows)).not.toContain(accessToken);
  expect(await test.db.select().from(orderStatusEvents)).toMatchObject([{ fromStatus: null, toStatus: "awaiting_payment", actor: "system" }]);
});

it("uses the payment expiry setting and gives each order a different token", async () => {
  await test.db.insert(settings).values({ key: "payment_expiry_hours", value: 6 });
  const first = await createOrder(test.db, orderInput(), BOOKED_AT);
  const second = await createOrder(test.db, orderInput(), BOOKED_AT);
  expect(first.order.paymentDueAt).toEqual(new Date(BOOKED_AT.getTime() + 6 * 3600_000));
  expect(second.order.reference).toBe("CAKE-2026-0002");
  expect(second.accessToken).not.toBe(first.accessToken);
});

it("starts a quote request as awaiting_quote with no deadline", async () => {
  const { order } = await createOrder(test.db, orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } }), BOOKED_AT);
  expect(order).toMatchObject({ status: "awaiting_quote", paymentDueAt: null });
});

it("keeps the snapshot when the catalogue price changes", async () => {
  await seedCatalogue(test.db);
  const { order } = await createOrder(test.db, orderInput({}, toPricingRules(await getCatalogue(test.db))), BOOKED_AT);
  await test.db.update(flavourGroups).set({ basePrice: 1500 }).where(eq(flavourGroups.key, "classic"));
  const repriced = priceBasket({ cake: { flavourGroup: "classic", tierSizes: [8], addons: [] }, delivery: false, eventDate: "2026-10-30" }, BOOKED_AT, toPricingRules(await getCatalogue(test.db)));
  expect(repriced.total).toBe(1200);
  const stored = await getOrder(test.db, order.id);
  expect(stored).toMatchObject({ order: { total: 1040, deposit: 520 }, lines: [{ kind: "cake", amount: 1040 }], currentPop: null });
});

it("stores a delivery address and rejects delivery without one", async () => {
  const pickup = orderInput();
  const basket = { lines: [...pickup.basket.lines, { kind: "delivery" as const, label: "Delivery", quantity: 1, unitAmount: 150, amount: 150, meta: {} }], total: 1190, deposit: 595 };
  const { order } = await createOrder(test.db, orderInput({ fulfilment: "delivery", deliveryAddress: " Plot 12, Kabulonga ", basket }), BOOKED_AT);
  expect(order.deliveryAddress).toBe("Plot 12, Kabulonga");
  for (const deliveryAddress of [undefined, "   "]) {
    await expect(createOrder(test.db, orderInput({ fulfilment: "delivery", deliveryAddress, basket }), BOOKED_AT)).rejects.toMatchObject({ code: "DELIVERY_ADDRESS_REQUIRED" });
  }
  expect(await counts()).toMatchObject({ orders: 1, events: 1 });
});

it("accepts a deposit one Kwacha below half the displayed total", async () => {
  const basket = orderInput().basket;
  const { order } = await createOrder(test.db, orderInput({ basket: {
    lines: basket.lines.map(line => ({ ...line, unitAmount: 2700, amount: 2700 })), total: 2700, deposit: 1349,
  } }), BOOKED_AT);
  expect(order).toMatchObject({ total: 2700, deposit: 1349 });
});

it.each<[string, Parameters<typeof orderInput>[0], string]>([
  ["invalid phone", { customer: { name: "A", phone: "12345", email: "a@example.com" } }, "PHONE_INVALID"],
  ["invalid email", { customer: { name: "A", phone: "0977123456", email: "not-an-email" } }, "ORDER_INVALID"],
  ["blank name", { customer: { name: " ", phone: "0977123456", email: "a@example.com" } }, "ORDER_INVALID"],
  ["empty priced basket", { basket: { lines: [], total: 0, deposit: 0 } }, "ORDER_INVALID"],
  ["lines not adding up", { basket: { lines: orderInput().basket.lines, total: 1, deposit: 0 } }, "ORDER_INVALID"],
  ["delivery fulfilment without a delivery line", { fulfilment: "delivery", deliveryAddress: "Plot 12, Kabulonga" }, "ORDER_INVALID"],
  ["pickup fulfilment with a delivery line", { basket: { lines: [...orderInput().basket.lines, { kind: "delivery", label: "Delivery", quantity: 1, unitAmount: 150, amount: 150, meta: {} }], total: 1190, deposit: 595 } }, "ORDER_INVALID"],
  ["zero deposit", { basket: { ...orderInput().basket, deposit: 0 } }, "ORDER_INVALID"],
  ["deposit two Kwacha below half", { basket: { lines: orderInput().basket.lines.map(line => ({ ...line, unitAmount: 2700, amount: 2700 })), total: 2700, deposit: 1348 } }, "ORDER_INVALID"],
  ["deposit above range", { basket: { ...orderInput().basket, deposit: 522 } }, "ORDER_INVALID"],
  ["cake line without meta", { basket: { ...orderInput().basket, lines: [{ ...orderInput().basket.lines[0], meta: {} }] } }, "ORDER_INVALID"],
])("rejects %s and stores nothing", async (_name, overrides, code) => {
  await expect(createOrder(test.db, orderInput(overrides), BOOKED_AT)).rejects.toSatisfy(error => error instanceof OrderError && error.code === code);
  expect(await counts()).toEqual({ orders: 0, lines: 0, events: 0, counters: 0 });
});

it("leaves no order, line, event or reference number when storing lines fails", async () => {
  await test.client.exec(`create function fail_lines() returns trigger language plpgsql as $$ begin raise exception 'lines failed'; end $$;
    create trigger fail_lines before insert on order_lines for each row execute function fail_lines();`);
  await expect(createOrder(test.db, orderInput(), BOOKED_AT)).rejects.toThrow();
  expect(await counts()).toEqual({ orders: 0, lines: 0, events: 0, counters: 0 });
  await test.db.execute(sql`drop trigger fail_lines on order_lines`);
  expect((await createOrder(test.db, orderInput(), BOOKED_AT)).order.reference).toBe("CAKE-2026-0001");
});
