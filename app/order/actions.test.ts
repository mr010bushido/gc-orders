import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { orderInput } from "@/lib/orders/fixtures";
import { submitPop } from "@/lib/orders/transitions";
import { setFlag } from "@/lib/orders/transitions";

const mocks = vi.hoisted(() => ({ db: undefined as unknown, callbacks: [] as (() => unknown)[], notify: vi.fn(), refresh: vi.fn() }));
vi.mock("next/server", () => ({ after: (callback: () => unknown) => mocks.callbacks.push(callback) }));
vi.mock("next/cache", () => ({ refresh: () => mocks.refresh() }));
vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/notify/notify", () => ({ notify: (...args: unknown[]) => mocks.notify(...args) }));

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); mocks.db = test.db; mocks.callbacks = []; mocks.notify.mockReset().mockResolvedValue(undefined); mocks.refresh.mockReset(); });
afterEach(async () => { await test.close(); });

async function action() { vi.resetModules(); return import("./actions"); }

it("returns after POP is stored and schedules notifications after the response", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { order, accessToken } = await createOrder(test.db, orderInput(), new Date());
  const { submitPopAction } = await action();
  await expect(submitPopAction(accessToken, "Airtel K520 sent, TID 123")).resolves.toEqual({ ok: true, status: "awaiting_verification" });
  expect(mocks.callbacks).toHaveLength(1);
  expect(mocks.refresh).toHaveBeenCalledOnce();
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
  expect(mocks.refresh).not.toHaveBeenCalled();
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

it("notifies from the saved order when recovery rotates the link during POP submission", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { order, accessToken } = await createOrder(test.db, orderInput(), new Date());
  const { submitPopAction } = await action();
  await test.client.exec(`
    CREATE FUNCTION rotate_token_on_pop() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE orders SET access_token_hash = 'rotated-during-submit' WHERE id = NEW.order_id;
      RETURN NEW;
    END $$;
    CREATE TRIGGER rotate_token_on_pop AFTER INSERT ON pop_submissions
    FOR EACH ROW EXECUTE FUNCTION rotate_token_on_pop();
  `);
  expect(await submitPopAction(accessToken, "Airtel K520 sent, TID 123")).toEqual({ ok: true, status: "awaiting_verification" });
  await mocks.callbacks[0]();
  expect(mocks.notify).toHaveBeenCalledWith("pop_received", { order: expect.objectContaining({ id: order.id, status: "awaiting_verification" }) }, { db: test.db });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("does not call a confirmed order past its payment deadline expired, and refreshes the stale page", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { transition } = await import("@/lib/orders/transitions");
  const now = new Date();
  const { order, accessToken } = await createOrder(test.db, orderInput(), now);
  await submitPop(test.db, order.id, "Airtel K520 sent, TID 123", new Date(now.getTime() + 1000));
  await transition(test.db, order.id, "verify", "owner", new Date(now.getTime() + 2000));
  await test.client.exec("UPDATE orders SET payment_due_at = now() - interval '1 day'");
  const { submitPopAction } = await action();
  const result = await submitPopAction(accessToken, "Airtel K520 sent again, TID 456");
  expect(result).toMatchObject({ ok: false, error: expect.stringContaining("already confirmed") });
  expect(result).not.toMatchObject({ error: expect.stringContaining("expired") });
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.callbacks).toHaveLength(0);
});

it("explains an order that is already awaiting verification and refreshes", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const now = new Date();
  const { order, accessToken } = await createOrder(test.db, orderInput(), now);
  await submitPop(test.db, order.id, "Airtel K520 sent, TID 123", new Date(now.getTime() + 1000));
  const { submitPopAction } = await action();
  expect(await submitPopAction(accessToken, "Airtel K520 sent again, TID 456")).toMatchObject({ ok: false, error: expect.stringContaining("already have your payment details") });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});

it("refreshes when an order has lapsed", async () => {
  const { createOrder } = await import("@/lib/orders/orders");
  const { accessToken } = await createOrder(test.db, orderInput(), new Date(Date.now() - 48 * 60 * 60 * 1000));
  const { submitPopAction } = await action();
  await submitPopAction(accessToken, "Airtel K520 sent, TID 123");
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
