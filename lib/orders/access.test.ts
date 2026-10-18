import { beforeAll, afterAll, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder } from "./orders";
import { FIND_BOOKING_MESSAGE, NOT_FOUND_MESSAGE, findMyBooking, findOrderForAccess, maskEmail, maskPhone } from "./access";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

it("returns the same missing result for a wrong token and an unknown reference", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const wrong = (accessToken[0] === "A" ? "B" : "A") + accessToken.slice(1);
  expect(await findOrderForAccess(test.db, order.reference, wrong)).toBeNull();
  expect(await findOrderForAccess(test.db, "CAKE-2099-9999", accessToken)).toBeNull();
  expect(NOT_FOUND_MESSAGE).toBe("We couldn't find that booking.");
  expect(await findOrderForAccess(test.db, order.reference, accessToken)).toMatchObject({ order: { reference: order.reference } });
});

it("masks contact details", () => {
  expect(maskPhone("+260977123456")).toBe("+260 ••• ••• 456");
  expect(maskEmail("mwila@example.com")).toBe("m•••@example.com");
});

it("sends a fresh link for matching phone formats with indistinguishable responses", async () => {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const hits: string[] = [];
  const limiter = { hit: async (key: string) => { hits.push(key); return true; } };
  const sent: string[] = [];
  const sms = { send: async ({ text }: { to: string; text: string }) => { sent.push(text); return { id: "fake" }; } };
  const deps = { db: test.db, limiter, sms, appUrl: "https://cakes.invalid", clientAddress: "address" };
  const found = await findMyBooking(order.reference, "0977 123 456", deps);
  const missing = await findMyBooking("CAKE-2099-9999", "0977 000 000", deps);
  expect(found).toEqual({ ok: true, message: FIND_BOOKING_MESSAGE });
  expect(missing).toEqual(found);
  expect(sent).toHaveLength(1);
  expect(sent[0]).toContain(`/order/${order.reference}?t=`);
  expect(hits).toHaveLength(4);
});

it("returns rate limited and sends no message after a limit", async () => {
  const sent: string[] = [];
  const result = await findMyBooking("CAKE-2026-0001", "0977 123 456", {
    db: test.db, clientAddress: "limited", appUrl: "https://cakes.invalid",
    limiter: { hit: async () => false },
    sms: { send: async ({ text }) => { sent.push(text); return { id: "fake" }; } },
  });
  expect(result).toEqual({ ok: false, code: "RATE_LIMITED" });
  expect(sent).toEqual([]);
});
