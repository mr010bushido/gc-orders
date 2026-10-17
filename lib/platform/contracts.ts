import { describe, expect, it } from "vitest";
import type { ImageStore } from "./image-store";
import type { OwnerAuth } from "./owner-auth";

type AuthFixture = {
  auth: OwnerAuth;
  headers: Headers;
  issuedLinks: URLSearchParams[];
};

export function ownerAuthContract(factory: () => AuthFixture) {
  describe("OwnerAuth contract", () => {
    it("returns null without a session", async () => {
      const { auth, headers } = factory();
      expect(await auth.getOwner(headers)).toBeNull();
    });

    it("completes a valid link and reads the owner", async () => {
      const { auth, headers, issuedLinks } = factory();
      await auth.sendMagicLink("owner@example.com", "/owner");
      const params = issuedLinks[0];
      expect(await auth.completeLogin(params)).toEqual({ id: "owner@example.com", email: "owner@example.com" });
      headers.set("authorization", `Bearer ${params.get("token")}`);
      expect(await auth.getOwner(headers)).toEqual({ id: "owner@example.com", email: "owner@example.com" });
    });

    it("rejects invalid and reused links without creating a session", async () => {
      const { auth, headers, issuedLinks } = factory();
      expect(await auth.completeLogin(new URLSearchParams("token=invalid"))).toBeNull();
      await auth.sendMagicLink("owner@example.com", "/owner");
      const params = issuedLinks[0];
      await auth.completeLogin(params);
      headers.set("authorization", `Bearer ${params.get("token")}`);
      await auth.signOut(headers);
      expect(await auth.completeLogin(params)).toBeNull();
      expect(await auth.getOwner(headers)).toBeNull();
    });

    it("signs out the current session", async () => {
      const { auth, headers, issuedLinks } = factory();
      await auth.sendMagicLink("owner@example.com", "/owner");
      await auth.completeLogin(issuedLinks[0]);
      headers.set("authorization", `Bearer ${issuedLinks[0].get("token")}`);
      await auth.signOut(headers);
      expect(await auth.getOwner(headers)).toBeNull();
    });
  });
}

type ImageFixture = {
  store: ImageStore;
  readSignedUrl(url: string): Uint8Array | null;
  advanceTime(seconds: number): void;
};

export function imageStoreContract(factory: () => ImageFixture) {
  describe("ImageStore contract", () => {
    it("keeps images private and reads them through a signed URL until expiry", async () => {
      const { store, readSignedUrl, advanceTime } = factory();
      await store.put("cake", new Uint8Array([1, 2]), "image/png");
      const url = await store.createSignedUrl("cake", 60);
      expect(readSignedUrl(url)).toEqual(new Uint8Array([1, 2]));
      advanceTime(61);
      expect(readSignedUrl(url)).toBeNull();
    });

    it("rejects a missing or deleted key", async () => {
      const { store } = factory();
      await expect(store.createSignedUrl("missing", 60)).rejects.toThrow();
      await store.put("cake", new Uint8Array([1]), "image/png");
      await store.delete("cake");
      await expect(store.createSignedUrl("cake", 60)).rejects.toThrow();
    });

    it("deletes idempotently", async () => {
      const { store } = factory();
      await expect(store.delete("missing")).resolves.toBeUndefined();
      await expect(store.delete("missing")).resolves.toBeUndefined();
    });
  });
}
