import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { imageStoreContract } from "../../contracts";
import { createSupabaseImageStore } from "./image-store";

function fixture() {
  const objects = new Map<string, Uint8Array>();
  const urls = new Map<string, { key: string; expires: number }>();
  let now = 0;
  let bucketName = "";
  const client = { storage: { from(bucket: string) {
    bucketName = bucket;
    return {
      async upload(key: string, bytes: Uint8Array) {
        objects.set(key, bytes.slice());
        return { data: {}, error: null };
      },
      async createSignedUrl(key: string, ttl: number) {
        if (!objects.has(key)) return { data: null, error: new Error("missing") };
        const signedUrl = `https://example.test/signed/${crypto.randomUUID()}`;
        urls.set(signedUrl, { key, expires: now + ttl });
        return { data: { signedUrl }, error: null };
      },
      async remove(keys: string[]) {
        keys.forEach(key => objects.delete(key));
        return { data: {}, error: null };
      },
    };
  } } } as unknown as SupabaseClient;
  return {
    store: createSupabaseImageStore(() => client, "private-images"),
    readSignedUrl(url: string) {
      const link = urls.get(url);
      return link && now < link.expires ? objects.get(link.key) ?? null : null;
    },
    advanceTime(seconds: number) { now += seconds; },
    bucketName() { return bucketName; },
  };
}

imageStoreContract(fixture);

it("uses the configured private bucket", async () => {
  const { store, bucketName } = fixture();
  await store.put("images/id.webp", new Uint8Array([1]), "image/webp");
  expect(bucketName()).toBe("private-images");
});
