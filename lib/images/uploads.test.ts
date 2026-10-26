import sharp from "sharp";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { orderImages } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { orderInput, BOOKED_AT } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { makeImageStoreFake } from "../platform/fakes";
import { deletePendingImage, uploadImage } from "./uploads";

let test: Awaited<ReturnType<typeof createTestDb>>;
let fake: ReturnType<typeof makeImageStoreFake>;
let bytes: Buffer;
const limiter = { hit: async () => true };

beforeEach(async () => {
  test = await createTestDb();
  fake = makeImageStoreFake();
  bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).jpeg().toBuffer();
});
afterEach(async () => { vi.restoreAllMocks(); await test.close(); });

async function uploaded() {
  const result = await uploadImage(test.db, fake.store, limiter, "192.0.2.1", bytes);
  const [row] = await test.db.select().from(orderImages).where(eq(orderImages.id, result.id));
  return { ...result, key: row.key };
}

it("compensates when the transaction rejects after its callback succeeded", async () => {
  const failure = new Error("commit failed");
  const transaction = test.db.transaction.bind(test.db);
  vi.spyOn(test.db, "transaction").mockImplementationOnce(async callback => transaction(async tx => {
    await callback(tx);
    throw failure;
  }));
  const remove = vi.spyOn(fake.store, "delete");
  await expect(uploadImage(test.db, fake.store, limiter, "192.0.2.1", bytes)).rejects.toBe(failure);
  expect(remove).toHaveBeenCalledOnce();
  expect(await test.db.select().from(orderImages)).toEqual([]);
  await expect(fake.store.createSignedUrl(remove.mock.calls[0][0], 300)).rejects.toThrow("Image not found");
});

it("keeps the original transaction error and logs no cleanup secrets", async () => {
  const failure = new Error("commit failed");
  const transaction = test.db.transaction.bind(test.db);
  vi.spyOn(test.db, "transaction").mockImplementationOnce(async callback => transaction(async tx => {
    await callback(tx);
    throw failure;
  }));
  vi.spyOn(fake.store, "delete").mockRejectedValueOnce(new Error("private token and key"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(uploadImage(test.db, fake.store, limiter, "192.0.2.1", bytes)).rejects.toBe(failure);
  expect(log).toHaveBeenCalledWith("Image upload cleanup failed");
});

it("keeps storage and an attachable row when the deletion marker cannot commit", async () => {
  const { id, token, key } = await uploaded();
  const failure = new Error("commit failed");
  const transaction = test.db.transaction.bind(test.db);
  vi.spyOn(test.db, "transaction").mockImplementationOnce(async callback => transaction(async tx => {
    await callback(tx);
    throw failure;
  }));
  const remove = vi.spyOn(fake.store, "delete");
  await expect(deletePendingImage(test.db, fake.store, id, token)).rejects.toBe(failure);
  expect(remove).not.toHaveBeenCalled();
  expect((await test.db.select().from(orderImages))[0].deletingAt).toBeNull();
  await expect(fake.store.createSignedUrl(key, 300)).resolves.toMatch(/^memory:/);
  expect((await createOrder(test.db, orderInput({ imageTokens: [token] }), BOOKED_AT)).order.id).toBeTruthy();
});

it("blocks attachment while deletion is in flight and retries failed storage cleanup", async () => {
  const { id, token, key } = await uploaded();
  let release!: () => void;
  const paused = new Promise<void>(resolve => { release = resolve; });
  const remove = vi.spyOn(fake.store, "delete").mockImplementationOnce(async () => {
    await paused;
    throw new Error("storage unavailable");
  });
  const deleting = deletePendingImage(test.db, fake.store, id, token);
  await vi.waitFor(() => expect(remove).toHaveBeenCalledOnce());
  expect((await test.db.select().from(orderImages))[0].deletingAt).toBeInstanceOf(Date);
  await expect(createOrder(test.db, orderInput({ imageTokens: [token] }), BOOKED_AT))
    .rejects.toMatchObject({ code: "IMAGE_NOT_FOUND" });
  release();
  await expect(deleting).rejects.toThrow("storage unavailable");
  expect((await test.db.select().from(orderImages))[0].deletingAt).toBeInstanceOf(Date);
  await expect(fake.store.createSignedUrl(key, 300)).resolves.toMatch(/^memory:/);
  expect(await deletePendingImage(test.db, fake.store, id, token)).toBe(true);
  expect(await test.db.select().from(orderImages)).toEqual([]);
  await expect(fake.store.createSignedUrl(key, 300)).rejects.toThrow("Image not found");
});

it("keeps a non-attachable retry row when SQL DELETE fails after storage deletion", async () => {
  const { id, token, key } = await uploaded();
  await test.client.exec(`create function reject_image_delete() returns trigger language plpgsql as $$ begin raise exception 'delete failed'; end $$;
    create trigger reject_image_delete before delete on order_images for each row execute function reject_image_delete()`);
  await expect(deletePendingImage(test.db, fake.store, id, token)).rejects.toThrow("Failed query: delete from");
  expect((await test.db.select().from(orderImages))[0].deletingAt).toBeInstanceOf(Date);
  await expect(fake.store.createSignedUrl(key, 300)).rejects.toThrow("Image not found");
  await expect(createOrder(test.db, orderInput({ imageTokens: [token] }), BOOKED_AT))
    .rejects.toMatchObject({ code: "IMAGE_NOT_FOUND" });
  await test.client.exec("drop trigger reject_image_delete on order_images; drop function reject_image_delete()");
  expect(await deletePendingImage(test.db, fake.store, id, token)).toBe(true);
  expect(await test.db.select().from(orderImages)).toEqual([]);
});
