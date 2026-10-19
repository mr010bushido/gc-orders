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
    await options.auth.sendMagicLink(email, callback.toString());
  }
  return "sent";
}
