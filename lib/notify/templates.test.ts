import { expect, it } from "vitest";
import { NOTIFICATION_EVENTS } from "../db/schema/notifications";
import { money, TEMPLATES, type TemplateContext } from "./templates";

const settings = { airtel_number: "+260776597882", mtn_number: "+260966222440", pickup_map_url: "https://maps.app.goo.gl/TXkVWRMSbxbA88K26?g_st=ac" };
const order = { reference: "CAKE-2026-0042", fulfilment: "pickup", eventDate: "2026-10-30", timeWindow: "afternoon", customerName: "Mwila Banda", total: 1300, deposit: 650 } as const;
const context = (overrides: Partial<TemplateContext["order"]> = {}, link = "https://cakes.test/order/CAKE-2026-0042?t=abc"): TemplateContext =>
  ({ order: { ...order, ...overrides }, link, settings });

// The longest realistic order: a 200-character name, five-figure amounts, a long origin and a 43-character token.
const longest = context({ reference: "CAKE-2026-9999", fulfilment: "delivery", customerName: `${"Chilufya".repeat(12)} ${"M".repeat(103)}`, total: 123456, deposit: 61728,
  timeWindow: "afternoon", eventDate: "2026-12-30" }, `https://orders.giuseppescakes.co.zm/order/CAKE-2026-9999?t=${"x".repeat(43)}`);

it("formats whole Kwacha with a thousands separator", () => {
  expect([money(0), money(650), money(1300), money(123456)]).toEqual(["K0", "K650", "K1,300", "K123,456"]);
});

it.each(NOTIFICATION_EVENTS)("%s SMS is plain text within 320 characters for the longest order", (event) => {
  for (const ctx of [longest, { ...longest, order: { ...longest.order, fulfilment: "pickup" as const } }]) {
    const { sms } = TEMPLATES[event](ctx);
    expect(sms.length).toBeLessThanOrEqual(320);
    expect(sms).toMatch(/^[\x20-\x7E]+$/);
    expect(sms).toContain(ctx.order.reference);
  }
});

it.each(NOTIFICATION_EVENTS)("%s never includes the customer's email or POP text and escapes HTML", (event) => {
  // Full order rows are passed in practice; the extra fields must not leak into any message.
  const message = TEMPLATES[event](context({ customerName: "<b>Mwila</b> Banda", customerEmail: "mwila@example.com", popText: "Airtel TID 123ABC" } as never));
  expect(JSON.stringify(message)).not.toMatch(/mwila@example.com|TID 123ABC/);
  expect(message.html).not.toContain("<b>");
  expect(message.subject).toContain("CAKE-2026-0042");
});

it("booking received carries the deposit, payment numbers, link and pickup pin", () => {
  const { sms, text, html } = TEMPLATES.booking_received(context());
  for (const part of ["K650", "Airtel +260776597882", "MTN +260966222440", "https://cakes.test/order/CAKE-2026-0042?t=abc", `Pickup pin: ${settings.pickup_map_url}`]) {
    expect(sms).toContain(part);
    expect(text).toContain(part);
  }
  expect(text).toMatch(/^Hi Mwila,/);
  expect(html).toContain(`<a href="${settings.pickup_map_url}">`);
});

it("deposit verified carries the pin and balance for pickup only", () => {
  expect(TEMPLATES.deposit_verified(context()).sms).toContain(`Pickup pin: ${settings.pickup_map_url}`);
  expect(TEMPLATES.deposit_verified(context()).sms).toContain("Balance K650 due on collection");
  const delivery = TEMPLATES.deposit_verified(context({ fulfilment: "delivery" })).sms;
  expect(delivery).not.toContain("Pickup pin");
  expect(delivery).toContain("due on delivery");
  expect(delivery).toContain("Fri 30 Oct (afternoon)");
});

it("quote ready links to the order with the deposit", () => {
  const { sms } = TEMPLATES.quote_ready(context({ total: 2000, deposit: 1000 }));
  expect(sms).toContain("Total K2,000, deposit K1,000.");
  expect(sms).toContain("https://cakes.test/order/CAKE-2026-0042?t=abc");
});

it("owner POP alert names the reference and the customer but not the POP text", () => {
  expect(TEMPLATES.owner_pop_submitted(context()).sms).toBe("POP submitted for CAKE-2026-0042 (Mwila Banda). Please verify the deposit of K650.");
});
