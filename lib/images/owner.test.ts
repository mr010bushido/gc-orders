import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { orderImages, orders } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { makeImageStoreFake } from "../platform/fakes";
import { getOrderImageUrls } from "./owner";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => { test = await createTestDb(); });
afterEach(async () => { await test.close(); });

it("checks the owner before reading rows or signing a URL", async () => {
  const sign = vi.fn(async () => "signed");
  const guard = vi.fn(async () => { throw new Error("not owner"); });
  await expect(getOrderImageUrls(crypto.randomUUID(), { db: test.db, store: { put: vi.fn(), delete: vi.fn(), createSignedUrl: sign }, guard: guard as never }))
    .rejects.toThrow("not owner");
  expect(guard).toHaveBeenCalledOnce();
  expect(sign).not.toHaveBeenCalled();
});

it("returns 300-second signed URLs only for the requested order", async () => {
  const [order] = await test.db.insert(orders).values({ reference: "CAKE-2026-0001", accessTokenHash: "hash", status: "awaiting_quote",
    fulfilment: "pickup", eventDate: "2026-11-30", timeWindow: "afternoon", customerName: "Owner", customerPhone: "+260977123456",
    customerEmail: "owner@example.com", deliveryAddress: "", designNotes: "", topperMessage: "", total: 0, deposit: 0,
    createdAt: new Date() }).returning();
  const fake = makeImageStoreFake();
  await fake.store.put("images/one.webp", new Uint8Array([1]), "image/webp");
  await test.db.insert(orderImages).values({ orderId: order.id, key: "images/one.webp", bytes: 1, width: 10, height: 20,
    tokenHash: "token", addressHash: "address", createdAt: new Date() });
  const result = await getOrderImageUrls(order.id, { db: test.db, store: fake.store, guard: async () => ({ id: "owner", email: "owner@example.com" }) });
  expect(result).toMatchObject([{ id: expect.any(String), width: 10, height: 20, url: expect.any(String) }]);
  expect(fake.readSignedUrl(result[0].url)).toEqual(new Uint8Array([1]));
  fake.advanceTime(301);
  expect(fake.readSignedUrl(result[0].url)).toBeNull();
});
