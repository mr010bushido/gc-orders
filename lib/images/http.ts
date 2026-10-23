import type { Db } from "../db";
import type { ImageStore } from "../platform/image-store";
import { clientAddress } from "../platform/client-address";
import type { RateLimiter } from "../platform/rate-limit";
import { ImageError, MAX_IMAGE_BYTES } from "./process";
import { deletePendingImage, UploadError, uploadImage } from "./uploads";

type Deps = { db: Db; store: ImageStore; limiter: RateLimiter };

const failure = (code: string, status: number, message = code) => Response.json({ ok: false, error: { code, message } }, { status });

async function boundedBody(request: Request): Promise<Uint8Array> {
  const max = MAX_IMAGE_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > max) throw new ImageError("IMAGE_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) throw new ImageError("IMAGE_TOO_LARGE");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}

export async function postUpload(request: Request, { db, store, limiter }: Deps): Promise<Response> {
  try {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new UploadError("INVALID_INPUT");
    const bytes = await boundedBody(request);
    let form: FormData;
    try {
      form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: new Blob([new Uint8Array(bytes)]) }).formData();
    } catch {
      throw new UploadError("INVALID_INPUT");
    }
    const image = form.get("image");
    if (Array.from(form.keys()).length !== 1 || !(image instanceof File)) throw new UploadError("INVALID_INPUT");
    const result = await uploadImage(db, store, limiter, clientAddress(request.headers), new Uint8Array(await image.arrayBuffer()));
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageError) return failure(error.code, error.code === "IMAGE_TOO_LARGE" ? 413 : error.code === "IMAGE_TYPE_UNSUPPORTED" ? 415 : 422, error.message);
    if (error instanceof UploadError) return failure(error.code, error.code === "RATE_LIMITED" ? 429 : 400);
    throw error;
  }
}

export async function removeUpload(request: Request, id: string, { db, store }: Pick<Deps, "db" | "store">): Promise<Response> {
  const token = request.headers.get("x-upload-token") ?? "";
  return await deletePendingImage(db, store, id, token)
    ? Response.json({ ok: true })
    : failure("IMAGE_NOT_FOUND", 404);
}
