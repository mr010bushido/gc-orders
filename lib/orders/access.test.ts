import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder, findOrderByToken } from "./orders";
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
  const scheduled: (() => Promise<void>)[] = [];
  const deps = { db: test.db, limiter, sms, appUrl: "https://cakes.invalid", clientAddress: "address", schedule: (work: () => Promise<void>) => { scheduled.push(work); } };
  const found = await findMyBooking(order.reference, "0977 123 456", deps);
  const missing = await findMyBooking("CAKE-2099-9999", "0977 000 000", deps);
  expect(found).toEqual({ ok: true, message: FIND_BOOKING_MESSAGE });
  expect(missing).toEqual(found);
  expect(sent).toHaveLength(0);
  expect(scheduled).toHaveLength(2);
  await Promise.all(scheduled.map(work => work()));
  expect(sent).toHaveLength(1);
  expect(sent[0]).toContain(`/order/${order.reference}?t=`);
  expect(hits).toHaveLength(4);
});

it("returns rate limited and sends no message after a limit", async () => {
  const sent: string[] = [];
  const hits: string[] = [];
  const schedule = vi.fn();
  const result = await findMyBooking("CAKE-2026-0001", "0977 123 456", {
    db: test.db, clientAddress: "limited", appUrl: "https://cakes.invalid",
    limiter: { hit: async (key) => { hits.push(key); return false; } }, schedule,
    sms: { send: async ({ text }) => { sent.push(text); return { id: "fake" }; } },
  });
  expect(result).toEqual({ ok: false, code: "RATE_LIMITED" });
  expect(hits).toEqual(["find-booking:ip:limited"]);
  expect(schedule).not.toHaveBeenCalled();
  expect(sent).toEqual([]);
});

it("does not rotate the private token when no link origin is configured", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const sent: string[] = [];
  const scheduled: (() => Promise<void>)[] = [];
  await expect(findMyBooking(order.reference, "0977 123 456", {
    db: test.db, clientAddress: "missing-origin", appUrl: "",
    schedule: work => { scheduled.push(work); },
    limiter: { hit: async () => true },
    sms: { send: async ({ text }) => { sent.push(text); return { id: "fake" }; } },
  })).resolves.toEqual({ ok: true, message: FIND_BOOKING_MESSAGE });
  await scheduled[0]();
  expect(sent).toEqual([]);
  expect(await findOrderByToken(test.db, accessToken)).not.toBeNull();
});

it("restores the original link when the SMS provider fails", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const scheduled: (() => Promise<void>)[] = [];
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await findMyBooking(order.reference, "0977 123 456", {
      db: test.db, clientAddress: "failed-send", appUrl: "https://cakes.invalid",
      limiter: { hit: async () => true }, schedule: work => { scheduled.push(work); },
      sms: { send: async () => { throw new Error("provider failed for +260977123456"); } },
    });
    expect(await findOrderByToken(test.db, accessToken)).not.toBeNull();
    await scheduled[0]();
    expect(await findOrderByToken(test.db, accessToken)).not.toBeNull();
    expect(log).toHaveBeenCalledWith("find-my-booking SMS failed");
    expect(log.mock.calls.flat().join(" ")).not.toContain("+260977123456");
  } finally { log.mockRestore(); }
});

it("keeps the last delivered link through overlapping recoveries when a send fails", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const scheduled: (() => Promise<void>)[] = [];
  const sent: string[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  let attempts = 0;
  const sms = { send: async ({ text }: { to: string; text: string }) => {
    attempts++;
    if (attempts === 1) { started(); await held; throw new Error("first send failed"); }
    sent.push(text);
    return { id: "fake" };
  } };
  const deps = { db: test.db, clientAddress: "overlap", appUrl: "https://cakes.invalid", limiter: { hit: async () => true }, schedule: (work: () => Promise<void>) => { scheduled.push(work); }, sms };
  await findMyBooking(order.reference, "0977 123 456", deps);
  await findMyBooking(order.reference, "0977 123 456", deps);
  const first = scheduled[0]();
  await sending;
  const second = scheduled[1]();
  release();
  await Promise.all([first, second]);
  expect(sent).toHaveLength(1);
  expect(await findOrderByToken(test.db, accessToken)).toBeNull();
  const token = new URL(sent[0].split(" ").at(-1)!).searchParams.get("t")!;
  expect(await findOrderByToken(test.db, token)).not.toBeNull();
});

it("does not restore an older token after a later overlapping send fails", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const scheduled: (() => Promise<void>)[] = [];
  const sent: string[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void;
  const sending = new Promise<void>(resolve => { started = resolve; });
  let attempts = 0;
  const sms = { send: async ({ text }: { to: string; text: string }) => {
    attempts++;
    if (attempts === 1) { started(); await held; sent.push(text); return { id: "fake" }; }
    throw new Error("later send failed");
  } };
  const deps = { db: test.db, clientAddress: "overlap-later-failure", appUrl: "https://cakes.invalid", limiter: { hit: async () => true }, schedule: (work: () => Promise<void>) => { scheduled.push(work); }, sms };
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await findMyBooking(order.reference, "0977 123 456", deps);
    await findMyBooking(order.reference, "0977 123 456", deps);
    const first = scheduled[0]();
    await sending;
    const second = scheduled[1]();
    release();
    await Promise.all([first, second]);
    expect(sent).toHaveLength(1);
    expect(await findOrderByToken(test.db, accessToken)).toBeNull();
    const token = new URL(sent[0].split(" ").at(-1)!).searchParams.get("t")!;
    expect(await findOrderByToken(test.db, token)).not.toBeNull();
    expect(log).toHaveBeenCalledWith("find-my-booking SMS failed");
  } finally { release(); log.mockRestore(); }
});
