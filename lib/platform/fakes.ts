import type { ImageStore } from "./image-store";
import type { OwnerAuth, Owner } from "./owner-auth";

export function makeOwnerAuthFake() {
  const issuedLinks: URLSearchParams[] = [];
  const pending = new Map<string, Owner>();
  const sessions = new Map<string, Owner>();
  const headers = new Headers();
  const auth: OwnerAuth = {
    async sendMagicLink(email) {
      const token = crypto.randomUUID();
      pending.set(token, { id: email, email });
      issuedLinks.push(new URLSearchParams({ token }));
    },
    async completeLogin(params) {
      const token = params.get("token") ?? "";
      const owner = pending.get(token) ?? null;
      pending.delete(token);
      if (owner) sessions.set(token, owner);
      return owner;
    },
    async getOwner(requestHeaders) {
      return sessions.get(requestHeaders.get("authorization")?.replace(/^Bearer /, "") ?? "") ?? null;
    },
    async signOut(requestHeaders) {
      sessions.delete(requestHeaders.get("authorization")?.replace(/^Bearer /, "") ?? "");
    },
  };
  return { auth, issuedLinks, headers };
}

export function makeImageStoreFake() {
  const images = new Map<string, Uint8Array>();
  const links = new Map<string, { key: string; expiresAt: number }>();
  let now = 0;
  const store: ImageStore = {
    async put(key, bytes) {
      images.set(key, bytes.slice());
    },
    async createSignedUrl(key, ttlSeconds) {
      if (!images.has(key)) throw new Error("Image not found");
      const url = `memory://${crypto.randomUUID()}`;
      links.set(url, { key, expiresAt: now + ttlSeconds });
      return url;
    },
    async delete(key) {
      images.delete(key);
    },
  };
  return {
    store,
    readSignedUrl(url: string) {
      const link = links.get(url);
      return link && now < link.expiresAt ? images.get(link.key) ?? null : null;
    },
    advanceTime(seconds: number) {
      now += seconds;
    },
  };
}
