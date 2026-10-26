import { readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { imageStoreContract } from "../../contracts";
import { createLocalImageStore } from "./image-store";

const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

function fixture() {
  const root = join(tmpdir(), `cake-images-${crypto.randomUUID()}`);
  roots.push(root);
  let now = 1_800_000_000_000;
  const store = createLocalImageStore(root, "local-test-secret", () => now);
  return {
    store,
    readSignedUrl: store.readSignedUrl,
    advanceTime(seconds: number) { now += seconds * 1000; },
    root,
  };
}

imageStoreContract(fixture);

it("stores a private WebP file without overwriting it", async () => {
  const { store, root } = fixture();
  const key = "images/cake.webp";
  await store.put(key, new Uint8Array([1, 2]), "image/webp");
  expect(await readFile(join(root, key))).toEqual(Buffer.from([1, 2]));
  expect((await stat(join(root, key))).mode & 0o777).toBe(0o600);
  await expect(store.put(key, new Uint8Array([3]), "image/webp")).rejects.toMatchObject({ code: "EEXIST" });
  expect(await readFile(join(root, key))).toEqual(Buffer.from([1, 2]));
  await expect(store.put("../public/leak.webp", new Uint8Array([1]), "image/webp")).rejects.toThrow("Invalid image key");
  await expect(store.put(key, new Uint8Array([1]), "image/png")).rejects.toThrow("WebP");
});

it("rejects tampered, traversing, expired, missing, and deleted reads", async () => {
  const { store, advanceTime } = fixture();
  const key = "images/cake.webp";
  await store.put(key, new Uint8Array([7]), "image/webp");
  const url = await store.createSignedUrl(key, 60);
  expect(await store.readSignedUrl(url)).toEqual(new Uint8Array([7]));
  const tampered = new URL(url, "http://localhost");
  tampered.searchParams.set("key", "images/other.webp");
  expect(await store.readSignedUrl(tampered.href)).toBeNull();
  tampered.searchParams.set("key", "../public/leak.webp");
  expect(await store.readSignedUrl(tampered.href)).toBeNull();
  expect(await store.readSignedUrl(`${url}&key=images/cake.webp`)).toBeNull();
  await expect(store.createSignedUrl(key, 301)).rejects.toThrow("lifetime");
  advanceTime(60);
  expect(await store.readSignedUrl(url)).toBeNull();
  const fresh = await store.createSignedUrl(key, 60);
  await store.delete(key);
  expect(await store.readSignedUrl(fresh)).toBeNull();
});

it("serves only valid local signed URLs through the route", async () => {
  const { root } = fixture();
  vi.stubEnv("IMAGE_STORE", "local");
  vi.stubEnv("LOCAL_IMAGE_DIR", root);
  vi.stubEnv("JOBS_SECRET", "route-test-secret");
  const store = createLocalImageStore(root, "route-test-secret");
  await store.put("images/cake.webp", new Uint8Array([9]), "image/webp");
  const { GET } = await import("../../../../app/api/images/local/route");
  const url = await store.createSignedUrl("images/cake.webp", 60);
  const response = await GET(new Request(new URL(url, "http://localhost")));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9]));
  const rejected = await Promise.all([
    GET(new Request(`http://localhost${url}broken`)),
    GET(new Request(`http://localhost/api/images/local?key=images%2F..%2Fpublic%2Fx.webp&expires=1893456000&signature=${'0'.repeat(64)}`)),
    GET(new Request(`http://localhost/api/images/local?key=images%2Fcake.webp&expires=1&signature=${'0'.repeat(64)}`)),
  ]);
  for (const invalid of rejected) {
    expect(invalid.status).toBe(404);
    expect(invalid.headers.get('cache-control')).toBe('private, no-store');
  }
  vi.stubEnv("IMAGE_STORE", "supabase");
  expect((await GET(new Request(new URL(url, "http://localhost")))).status).toBe(404);
  vi.stubEnv("IMAGE_STORE", "local");
  vi.stubEnv("NODE_ENV", "production");
  expect((await GET(new Request(new URL(url, "http://localhost")))).status).toBe(404);
});

it.each(["public/images", ".next/images"])("refuses storage under %s", (directory) => {
  vi.stubEnv("LOCAL_IMAGE_DIR", directory);
  expect(() => createLocalImageStore()).toThrow("outside public and .next");
});
