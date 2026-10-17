import { createHash, timingSafeEqual } from "node:crypto";

const jobs = new Map<string, () => Promise<void> | void>();

export function defineJob(name: string, handler: () => Promise<void> | void) {
  jobs.set(name, handler);
}

export function getJob(name: string) {
  return jobs.get(name);
}

export function verifySecret(supplied: string, expected = process.env.JOBS_SECRET) {
  if (!expected) return false;
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  const matches = timingSafeEqual(suppliedHash, expectedHash);
  return Boolean(supplied) && matches;
}
