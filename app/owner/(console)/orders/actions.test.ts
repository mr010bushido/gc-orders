import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTestDb } from "../../../../lib/db/test-db";
import { orders } from "../../../../lib/db/schema";
import { orderInput } from "../../../../lib/orders/fixtures";
import { createOrder } from "../../../../lib/orders/orders";
import { makeImageStoreFake } from "../../../../lib/platform/fakes";

const mocks = vi.hoisted(() => ({ db: undefined as unknown, guard: vi.fn(), store: undefined as unknown }));
vi.mock("../../../../lib/auth/require-owner", () => ({ requireOwner: mocks.guard }));
vi.mock("../../../../lib/db", async importOriginal => ({ ...await importOriginal<typeof import("../../../../lib/db")>(), getDb: () => mocks.db }));
vi.mock("../../../../lib/platform/image-store-select", () => ({ imageStore: () => mocks.store }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); mocks.db = test.db; mocks.guard.mockReset().mockResolvedValue({ id: "owner", email: "owner@example.test" }); mocks.store = makeImageStoreFake().store; });
afterEach(async () => { await test.close(); vi.resetModules(); });

it("guards first, refuses active orders, and erases completed order data", async () => {
  const { eraseOrderData } = await import("./actions");
  const active = await createOrder(test.db, orderInput(), new Date("2026-10-17T08:00:00Z"));
  expect(await eraseOrderData(active.order.id)).toEqual({ ok: false, code: "ORDER_ACTIVE" });
  expect(mocks.guard).toHaveBeenCalledOnce();
  await test.db.update(orders).set({ status: "completed" }).where(eq(orders.id, active.order.id));
  expect(await eraseOrderData(active.order.id)).toEqual({ ok: true });
  const [saved] = await test.db.select().from(orders).where(eq(orders.id, active.order.id));
  expect(saved).toMatchObject({ customerName: null, anonymisedAt: expect.any(Date), privacyConsentAt: new Date("2026-10-17T08:00:00Z") });
  expect(mocks.guard).toHaveBeenCalledTimes(2);
});
