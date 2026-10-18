import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { seedCatalogue } from "@/lib/catalogue/seed";
import { createOrder, getOrder } from "@/lib/orders/orders";
import { orderInput } from "@/lib/orders/fixtures";
import { markBalancePaid, submitPop, transition } from "@/lib/orders/transitions";
import { submitPopAction } from "./actions";

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
