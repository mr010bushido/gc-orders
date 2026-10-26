import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { seedCatalogue } from "@/lib/catalogue/seed";
import { createOrder, getOrder } from "@/lib/orders/orders";
import { orderInput } from "@/lib/orders/fixtures";
import { markBalancePaid, setFlag, submitPop, transition } from "@/lib/orders/transitions";
import { submitPopAction } from "./actions";
import { sendQuote } from "@/lib/quotes/quotes";
import { quoteRequests } from "@/lib/db/schema";

const mocks = vi.hoisted(() => ({ db: undefined as unknown, after: vi.fn(), refresh: vi.fn() }));
vi.mock("next/server", () => ({ connection: async () => {}, after: (callback: () => unknown) => mocks.after(callback) }));
vi.mock("next/cache", () => ({ refresh: () => mocks.refresh() }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/notify/notify", () => ({ notify: vi.fn().mockResolvedValue(undefined) }));

let testDb: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  testDb = await createTestDb();
  await seedCatalogue(testDb.db);
  mocks.db = testDb.db;
});
afterAll(async () => { await testDb.close(); });

async function page(reference: string, token?: string) {
  const { default: OrderPage } = await import("./[reference]/page");
  const element = await OrderPage({ params: Promise.resolve({ reference }), searchParams: Promise.resolve({ t: token }) });
  return renderToStaticMarkup(element);
}

it("opens a private order, submits POP, then shows awaiting verification", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const initial = await page(order.reference, accessToken);
  expect(initial).toContain("Awaiting payment");
  expect(initial).toContain("Deposit amount");
  expect(initial).not.toContain("Deposit paid");
  expect(initial).toContain("Airtel Money");
  expect(initial).not.toContain(order.customerPhone!);
  expect(initial).not.toContain("deliveryAddress");
  expect(initial).not.toContain("accessTokenHash");

  await expect(submitPopAction(accessToken, "Airtel money payment confirmation TID 83921"))
    .resolves.toEqual({ ok: true, status: "awaiting_verification" });
  expect(mocks.refresh).toHaveBeenCalledOnce();
  const updated = await page(order.reference, accessToken);
  expect(updated).toContain("Awaiting verification");
  expect(updated).toContain("Your payment details are with the owner for verification.");
  expect(updated).toMatch(/role="status" aria-live="polite"[^>]*>Your payment details are with the owner for verification\./);
  expect(updated).toContain("Deposit amount");
  expect(updated).not.toContain("Pay your 50% deposit");
});

it("shows Awaiting quote and a settled balance of K0", async () => {
  const quote = await createOrder(testDb.db, orderInput({ requestsQuote: true }), new Date());
  expect(await page(quote.order.reference, quote.accessToken)).toContain("Awaiting quote");
  expect(await page(quote.order.reference, quote.accessToken)).not.toContain(">New<");

  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const now = new Date();
  await submitPop(testDb.db, order.id, "Airtel money payment confirmation TID 83921", now);
  await transition(testDb.db, order.id, "verify", "owner", now);
  const confirmed = await page(order.reference, accessToken);
  expect(confirmed).toContain("Confirmed");
  expect(confirmed).toContain("Deposit amount");
  await markBalancePaid(testDb.db, order.id, { method: "cash" }, now);
  const paid = await page(order.reference, accessToken);
  expect(paid).toMatch(/Balance due<\/dt><dd[^>]*>K0<\/dd>/);
  expect((await getOrder(testDb.db, order.id))?.order.balancePaidAt).not.toBeNull();
});

it("uses not-found for a wrong token and an unknown reference", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const wrong = `${accessToken.slice(0, -1)}${accessToken.endsWith("A") ? "B" : "A"}`;
  await expect(page(order.reference, wrong)).rejects.toThrow("NOT_FOUND");
  await expect(page("CAKE-2099-9999", accessToken)).rejects.toThrow("NOT_FOUND");
});

it("formats the event date and capitalises timeline labels", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const html = await page(order.reference, accessToken);
  expect(html).toContain("30 October 2026");
  expect(html).toContain('font-medium">Awaiting payment</p>');
  expect(html).toContain("Pay by ");
  expect(html).toContain("(Lusaka time)");
});

it("hides amounts and shows Quote pending until a quote exists", async () => {
  const quote = await createOrder(testDb.db, orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } }), new Date());
  await testDb.db.insert(quoteRequests).values({ orderId: quote.order.id, kind: "wedding_cake", description: "Three tier floral cake" });
  const html = await page(quote.order.reference, quote.accessToken);
  expect(html).toContain("Quote pending");
  expect(html).toContain("Quote request · wedding cake");
  expect(html).toContain("Three tier floral cake");
  for (const text of ["Deposit amount", "Balance due", "K0"]) expect(html).not.toContain(text);
  for (const text of ["Pay your 50% deposit", "Airtel Money", "MTN MoMo", "<textarea"]) expect(html).not.toContain(text);
});

it("shows a sent quote through POP submission and owner verification using the rotated link", async () => {
  const quote = await createOrder(testDb.db, orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } }), new Date());
  await testDb.db.insert(quoteRequests).values({ orderId: quote.order.id, kind: "wedding_cake", description: "Three tier floral cake" });
  const now = new Date();
  const sent = await sendQuote(testDb.db, quote.order.id, [{ label: "Wedding cake, 3 tier", amount: 6000 }], now);
  expect(sent.order).toMatchObject({ status: "awaiting_payment", total: 6000, deposit: 3000 });
  await expect(page(quote.order.reference, quote.accessToken)).rejects.toThrow("NOT_FOUND");

  const priced = await page(quote.order.reference, sent.token);
  expect(priced).toContain("Wedding cake, 3 tier");
  expect(priced).toContain("K6,000");
  expect(priced).toContain("K3,000");
  expect(priced).toContain("Pay your 50% deposit");
  expect(priced).toContain("Airtel Money");
  expect(priced).toContain("<textarea");

  await expect(submitPopAction(sent.token, "Airtel money payment confirmation TID 83921"))
    .resolves.toEqual({ ok: true, status: "awaiting_verification" });
  await transition(testDb.db, quote.order.id, "verify", "owner", now);
  const verified = await page(quote.order.reference, sent.token);
  expect(verified).toContain("Confirmed");
  expect(verified).not.toContain("Pay your 50% deposit");
  expect(verified).not.toContain("<textarea");
});

it("tells a customer who answered a flag that their details arrived and hides the form", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const now = Date.now();
  await submitPop(testDb.db, order.id, "Airtel money payment confirmation TID 1", new Date(now + 1000));
  await setFlag(testDb.db, order.id, "Please send the whole SMS", new Date(now + 2000));
  const flagged = await page(order.reference, accessToken);
  expect(flagged).toContain("Please send the payment confirmation again");
  expect(flagged).toContain("Please send the whole SMS");
  expect(flagged).toContain("<textarea");

  await submitPop(testDb.db, order.id, "Airtel money payment confirmation TID 2, full text", new Date(now + 3000));
  const answered = await page(order.reference, accessToken);
  expect(answered).toContain("We’ve received your updated details");
  expect(answered).not.toContain("Please send the payment confirmation again");
  expect(answered).not.toContain("Please send the whole SMS");
  expect(answered).not.toContain("<textarea");
  expect(answered).not.toContain("Pay your 50% deposit");

  await setFlag(testDb.db, order.id, "One more detail", new Date(now + 4000));
  expect(await page(order.reference, accessToken)).toContain("<textarea");
});

it("shows a lapsed order as expired with no POP form", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date(Date.now() - 48 * 60 * 60 * 1000));
  const html = await page(order.reference, accessToken);
  expect(html).toContain("Expired");
  expect(html).toContain("This booking has expired.");
  expect(html).toContain('href="/book"');
  expect(html).not.toContain("<textarea");
  expect(html).not.toContain("Pay your 50% deposit");
});

it("links a confirmed pickup order to the pickup pin, and only then", async () => {
  const pin = "https://maps.app.goo.gl/TXkVWRMSbxbA88K26?g_st=ac";
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  expect(await page(order.reference, accessToken)).not.toContain(pin);
  const now = new Date();
  await submitPop(testDb.db, order.id, "Airtel money payment confirmation TID 83921", now);
  await transition(testDb.db, order.id, "verify", "owner", now);
  const html = await page(order.reference, accessToken);
  expect(html).toContain(`href="${pin}"`);
  expect(html).toContain("Open pickup location");
});

it("uses not-found when the token is missing", async () => {
  const { order } = await createOrder(testDb.db, orderInput(), new Date());
  await expect(page(order.reference)).rejects.toThrow("NOT_FOUND");
});

it("renders one not-found page with a way back, using tokens only", async () => {
  const { default: NotFound } = await import("./[reference]/not-found");
  const html = renderToStaticMarkup(NotFound());
  expect(html).toContain("The link may be old");
  expect(html).toMatch(/href="\/order"/);
  expect(html).not.toMatch(/CAKE-|#[0-9a-fA-F]{3,8}\b/);
  const { readFileSync } = await import("node:fs");
  for (const file of ["[reference]/not-found.tsx", "[reference]/page.tsx", "page.tsx", "pop-form.tsx", "find-form.tsx", "status-message.tsx"]) {
    expect(readFileSync(new URL(file, import.meta.url), "utf8")).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\b(bg|text|border)-(black|white)\b/);
  }
});
