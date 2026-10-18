import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { seedCatalogue } from "@/lib/catalogue/seed";
import { createOrder } from "@/lib/orders/orders";
import { orderInput } from "@/lib/orders/fixtures";
import { submitPopAction } from "./actions";

const mocks = vi.hoisted(() => ({ db: undefined as unknown, after: vi.fn() }));
vi.mock("next/server", () => ({ connection: async () => {}, after: (callback: () => unknown) => mocks.after(callback) }));
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
  expect(initial).toContain("Airtel Money");
  expect(initial).not.toContain(order.customerPhone!);
  expect(initial).not.toContain("deliveryAddress");
  expect(initial).not.toContain("accessTokenHash");

  await expect(submitPopAction(accessToken, "Airtel money payment confirmation TID 83921"))
    .resolves.toEqual({ ok: true, status: "awaiting_verification" });
  const updated = await page(order.reference, accessToken);
  expect(updated).toContain("Awaiting verification");
  expect(updated).toContain("Your payment details are with the owner for verification.");
});

it("uses not-found for a wrong token and an unknown reference", async () => {
  const { order, accessToken } = await createOrder(testDb.db, orderInput(), new Date());
  const wrong = `${accessToken.slice(0, -1)}${accessToken.endsWith("A") ? "B" : "A"}`;
  await expect(page(order.reference, wrong)).rejects.toThrow("NOT_FOUND");
  await expect(page("CAKE-2099-9999", accessToken)).rejects.toThrow("NOT_FOUND");
});
