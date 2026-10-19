import { clientAddress } from "../platform/client-address";
import { rateLimiter, type RateLimiter } from "../platform/rate-limit";
import type { OwnerAuth } from "../platform/owner-auth";

export type LoginRequestResult = "sent" | "rate-limited" | "not-configured";

export async function requestOwnerLogin(
  emailInput: unknown,
  requestHeaders: Headers,
  origin: string,
  options: {
    auth: OwnerAuth;
    limiter?: RateLimiter;
    ownerEmail?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  },
): Promise<LoginRequestResult> {
  const ownerEmail = options.ownerEmail ?? process.env.OWNER_EMAIL;
  const supabaseUrl = options.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = options.supabaseAnonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!ownerEmail?.trim() || !supabaseUrl || !supabaseAnonKey) return "not-configured";

  const email = typeof emailInput === "string" ? emailInput.trim().toLowerCase() : "";
  if (!email || email.length > 254) return "sent";
  const limiter = options.limiter ?? rateLimiter;
  const addressAllowed = await limiter.hit(`owner-login:address:${clientAddress(requestHeaders)}`, 5, 3600);
  const emailAllowed = await limiter.hit(`owner-login:email:${email}`, 5, 3600);
  if (!addressAllowed || !emailAllowed) return "rate-limited";

  if (email === ownerEmail.trim().toLowerCase()) {
    const callback = new URL("/owner/auth/callback", origin);
    // A send failure must look like success, or an error would tell a stranger which email is the owner's.
    await options.auth.sendMagicLink(email, callback.toString()).catch(() => console.error("Owner login link could not be sent"));
  }
  return "sent";
}

/** The origin for the emailed link. `APP_URL` wins so a forged Host header cannot point the owner's link elsewhere. */
export function loginOrigin(requestHeaders: Pick<Headers, "get">, appUrl = process.env.APP_URL): string | null {
  if (appUrl?.trim()) {
    try { return new URL(appUrl.trim()).origin; } catch { return null; }
  }
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  return host ? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${host}` : null;
}
