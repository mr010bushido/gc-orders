import sharp from "sharp";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createTestDb } from "../db/test-db";
import { makeImageStoreFake } from "../platform/fakes";
import type { RateLimiter } from "../platform/rate-limit";
import { postUpload, removeUpload } from "./http";

let test: Awaited<ReturnType<typeof createTestDb>>;
let fake: ReturnType<typeof makeImageStoreFake>;
let limiter: RateLimiter;
let image: Buffer;
beforeEach(async () => {
  test = await createTestDb();
  fake = makeImageStoreFake();
  limiter = { hit: async () => true };
  image = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).jpeg().toBuffer();
});
afterEach(async () => { await test.close(); });

function request(bytes: Uint8Array, name = "photo.jpg", address = "192.0.2.1") {
  const form = new FormData();
  form.append("image", new File([bytes.slice()], name));
  return new Request("http://localhost/api/uploads", { method: "POST", headers: { "x-real-ip": address }, body: form });
}

it("uploads privately and deletes with its token", async () => {
  const response = await postUpload(request(image), { db: test.db, store: fake.store, limiter });
  expect(response.status).toBe(201);
  const { id, token } = await response.json();
  const wrong = await removeUpload(new Request("http://localhost", { headers: { "x-upload-token": "wrong" } }), id, { db: test.db, store: fake.store });
  expect(wrong.status).toBe(404);
  expect((await wrong.json()).error.code).toBe("IMAGE_NOT_FOUND");
  const removed = await removeUpload(new Request("http://localhost", { headers: { "x-upload-token": token } }), id, { db: test.db, store: fake.store });
  expect(removed.status).toBe(200);
  expect(await removeUpload(new Request("http://localhost", { headers: { "x-upload-token": token } }), id, { db: test.db, store: fake.store })).toHaveProperty("status", 404);
});

it("returns a distinct response for each validation failure", async () => {
  const deps = { db: test.db, store: fake.store, limiter };
  for (const [bytes, status, code] of [
    [new Uint8Array(6 * 1024 * 1024), 413, "IMAGE_TOO_LARGE"],
    [Buffer.from("%PDF-1.4"), 415, "IMAGE_TYPE_UNSUPPORTED"],
    [Buffer.from([0xff, 0xd8, 0xff, 0]), 422, "IMAGE_INVALID"],
  ] as const) {
    const response = await postUpload(request(bytes), deps);
    expect(response.status).toBe(status);
    expect((await response.json()).error.code).toBe(code);
  }
  const invalid = await postUpload(new Request("http://localhost", { method: "POST", body: "bad" }), deps);
  expect(invalid.status).toBe(400);
  expect((await invalid.json()).error.code).toBe("INVALID_INPUT");
});

it("enforces the hourly limiter and six pending images per address", async () => {
  const blocked = await postUpload(request(image), { db: test.db, store: fake.store, limiter: { hit: async () => false } });
  expect(blocked.status).toBe(429);
  expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
  for (let i = 0; i < 6; i++) expect((await postUpload(request(image), { db: test.db, store: fake.store, limiter })).status).toBe(201);
  const seventh = await postUpload(request(image), { db: test.db, store: fake.store, limiter });
  expect(seventh.status).toBe(429);
  expect((await seventh.json()).error.code).toBe("RATE_LIMITED");
  expect((await postUpload(request(image, "photo.jpg", "192.0.2.2"), { db: test.db, store: fake.store, limiter })).status).toBe(201);
});
