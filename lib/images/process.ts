import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageErrorCode = "IMAGE_TOO_LARGE" | "IMAGE_TYPE_UNSUPPORTED" | "IMAGE_INVALID";

export class ImageError extends Error {
  constructor(public readonly code: ImageErrorCode, message: string = code) {
    super(message);
    this.name = "ImageError";
  }
}

function supportedSignature(bytes: Uint8Array): boolean {
  return (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    || (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF"
      && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP");
}

export async function processImage(bytes: Uint8Array): Promise<{ bytes: Buffer; width: number; height: number }> {
  if (bytes.length > MAX_IMAGE_BYTES) throw new ImageError("IMAGE_TOO_LARGE");
  if (!supportedSignature(bytes)) throw new ImageError("IMAGE_TYPE_UNSUPPORTED", "Choose a JPEG, PNG or WebP photo.");
  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    return { bytes: data, width: info.width, height: info.height };
  } catch {
    throw new ImageError("IMAGE_INVALID", "This photo could not be read.");
  }
}
