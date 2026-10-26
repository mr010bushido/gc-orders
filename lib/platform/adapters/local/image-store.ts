import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { ImageStore } from "../../image-store";

const KEY = /^images\/[A-Za-z0-9_-]+\.webp$/;
const MAX_TTL_SECONDS = 300;

function imagePath(root: string, key: string): string {
  if (!KEY.test(key)) throw new Error("Invalid image key");
  return join(root, key);
}

function storageRoot(): string {
  const root = resolve(/* turbopackIgnore: true */ process.env.LOCAL_IMAGE_DIR ?? ".local/cake-images");
  for (const exposed of ["public", ".next"]) {
    const path = relative(resolve(/* turbopackIgnore: true */ exposed), root);
    if (path === "" || (!path.startsWith("..") && !path.startsWith("/"))) {
      throw new Error("Local image storage must be outside public and .next");
    }
  }
  return root;
}

function signature(secret: string, key: string, expires: number): Buffer {
  return createHmac("sha256", secret).update(`local-image\0${key}\0${expires}`).digest();
}

export function createLocalImageStore(
  root = storageRoot(),
  secret = process.env.JOBS_SECRET,
  now: () => number = Date.now,
): ImageStore & { readSignedUrl(url: string): Promise<Uint8Array | null> } {
  return {
    async put(key, bytes, contentType) {
      if (contentType !== "image/webp") throw new Error("Local storage accepts WebP images only");
      const path = imagePath(root, key);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    },
    async createSignedUrl(key, ttlSeconds) {
      const path = imagePath(root, key);
      if (!secret) throw new Error("JOBS_SECRET is required for local image storage");
      if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > MAX_TTL_SECONDS) {
        throw new Error("Invalid image URL lifetime");
      }
      await stat(/* turbopackIgnore: true */ path);
      const expires = Math.floor(now() / 1000) + ttlSeconds;
      const query = new URLSearchParams({ key, expires: String(expires), signature: signature(secret, key, expires).toString("hex") });
      return `/api/images/local?${query}`;
    },
    async delete(key) {
      try {
        await unlink(imagePath(root, key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    },
    async readSignedUrl(url) {
      if (!secret) return null;
      let parsed: URL;
      try { parsed = new URL(url, "http://localhost"); } catch { return null; }
      const params = parsed.searchParams;
      const key = params.get("key") ?? "";
      const expiresText = params.get("expires") ?? "";
      const signatureText = params.get("signature") ?? "";
      if (parsed.pathname !== "/api/images/local" || [...params].length !== 3 ||
        !KEY.test(key) || !/^[0-9]+$/.test(expiresText) || !/^[0-9a-f]{64}$/.test(signatureText)) return null;
      const expires = Number(expiresText);
      const current = Math.floor(now() / 1000);
      if (!Number.isSafeInteger(expires) || expires <= current || expires > current + MAX_TTL_SECONDS) return null;
      if (!timingSafeEqual(Buffer.from(signatureText, "hex"), signature(secret, key, expires))) return null;
      try { return new Uint8Array(await readFile(/* turbopackIgnore: true */ imagePath(root, key))); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
  };
}
