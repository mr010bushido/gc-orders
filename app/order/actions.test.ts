import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { orderInput } from "@/lib/orders/fixtures";
import { submitPop } from "@/lib/orders/transitions";
import { setFlag } from "@/lib/orders/transitions";

const mocks = vi.hoisted(() => ({ db: undefined as unknown, callbacks: [] as (() => unknown)[], notify: vi.fn() }));
vi.mock("next/server", () => ({ after: (callback: () => unknown) => mocks.callbacks.push(callback) }));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/notify/notify", () => ({ notify: (...args: unknown[]) => mocks.notify(...args) }));

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); mocks.db = test.db; mocks.callbacks = []; mocks.notify.mockReset().mockResolvedValue(undefined); });
afterEach(async () => { await test.close(); });

async function action() { vi.resetModules(); return import("./actions"); }

it("returns after POP is stored and schedules notifications after the response", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { order, accessToken } = await createOrder(test.db, orderInput(), new Date());
  const { submitPopAction } = await action();
  await expect(submitPopAction(accessToken, "Airtel K520 sent, TID 123")).resolves.toEqual({ ok: true, status: "awaiting_verification" });
  expect(mocks.callbacks).toHaveLength(1);
  expect(mocks.notify).not.toHaveBeenCalled();
  await mocks.callbacks[0]();
  expect(mocks.notify.mock.calls.map(([event]) => event).sort()).toEqual(["owner_pop_submitted", "pop_received"]);
  const { getOrder } = await import("@/lib/orders/orders");
  expect((await getOrder(test.db, order.id))?.order.status).toBe("awaiting_verification");
});

it("shows validation for short text and treats a wrong token as generic failure", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { accessToken } = await createOrder(test.db, orderInput(), new Date());
  const { submitPopAction } = await action();
  expect(await submitPopAction(accessToken, "short")).toMatchObject({ ok: false, error: expect.stringContaining("10 characters") });
  expect(await submitPopAction("wrong-token", "Airtel K520 sent, TID 123")).toMatchObject({ ok: false });
  expect(mocks.callbacks).toHaveLength(0);
});

it("allows a flagged order to receive another POP without changing its status", async () => {
  const { createOrder, getOrder } = await import("@/lib/orders/orders");
  const now = new Date();
  const { order, accessToken } = await createOrder(test.db, orderInput(), now);
  await submitPop(test.db, order.id, "first payment confirmation text", new Date(now.getTime() + 1000));
  await setFlag(test.db, order.id, "Please clarify", new Date(now.getTime() + 2000));
  const { submitPopAction } = await action();
  expect(await submitPopAction(accessToken, "second payment confirmation text")).toEqual({ ok: true, status: "awaiting_verification" });
  expect((await getOrder(test.db, order.id))?.order.status).toBe("awaiting_verification");
});

it("refuses an expired order and provider failures stay outside the action response", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const past = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const { accessToken } = await createOrder(test.db, orderInput(), past);
  const { submitPopAction } = await action();
  expect(await submitPopAction(accessToken, "Airtel K520 sent, TID 123")).toMatchObject({ ok: false, error: expect.stringContaining("expired") });

  const { accessToken: liveToken } = await createOrder(test.db, orderInput(), new Date());
  mocks.notify.mockRejectedValue(new Error("provider failed"));
  expect(await submitPopAction(liveToken, "Airtel K520 sent, TID 123")).toEqual({ ok: true, status: "awaiting_verification" });
  await expect(mocks.callbacks.at(-1)?.()).resolves.toBeUndefined();
});
