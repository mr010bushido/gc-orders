import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { expect, it } from "vitest";
import { ImageError, processImage } from "./process";

it("rotates, shrinks and strips GPS EXIF", async () => {
  const photo = await readFile("lib/images/fixtures/gps-large.jpg");
  expect((await sharp(photo).metadata()).exif).toBeDefined();
  const result = await processImage(photo);
  expect([result.width, result.height]).toEqual([1600, 1200]);
  expect((await sharp(result.bytes).metadata()).exif).toBeUndefined();
  expect((await sharp(result.bytes).metadata()).format).toBe("webp");
});

it("keeps a small photo's dimensions", async () => {
  const result = await processImage(await sharp({ create: { width: 800, height: 600, channels: 3, background: "blue" } }).png().toBuffer());
  expect([result.width, result.height]).toEqual([800, 600]);
});

it("rejects oversized, renamed PDF and corrupt images", async () => {
  await expect(processImage(new Uint8Array(6 * 1024 * 1024))).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" } satisfies Partial<ImageError>);
  await expect(processImage(Buffer.from("%PDF-1.4"))).rejects.toMatchObject({ code: "IMAGE_TYPE_UNSUPPORTED" });
  await expect(processImage(Buffer.from([0xff, 0xd8, 0xff, 0]))).rejects.toMatchObject({ code: "IMAGE_INVALID" });
});
