/**
 * The address to rate-limit a request by. Only headers a trusted reverse proxy overwrites are used:
 * `x-real-ip`, else the right-most `x-forwarded-for` entry (the one the nearest proxy appended).
 * The left-most entry is client-supplied and never trusted. With neither header, every caller shares one "unknown" bucket.
 */
export function clientAddress(headers: Pick<Headers, "get">): string {
  const address = headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return address ? address.slice(0, 64) : "unknown";
}
