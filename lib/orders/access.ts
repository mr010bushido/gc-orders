import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { orders } from "../db/schema";
import { rateLimiter, type RateLimiter } from "../platform/rate-limit";
import { normaliseZambianMobile } from "../phone";
import { findOrderByToken, type OrderDetail } from "./orders";
import { createSmsSender, type SmsSender } from "../notify/sms";

export const NOT_FOUND_MESSAGE = "We couldn't find that booking.";
export const FIND_BOOKING_MESSAGE = "If that booking exists, we've sent a link.";

export function maskPhone(phone: string | null): string {
  const normalised = phone && normaliseZambianMobile(phone);
  return normalised ? `${normalised.slice(0, 4)} ••• ••• ${normalised.slice(-3)}` : "Hidden";
}

export function maskEmail(email: string | null): string {
  if (!email) return "Hidden";
  const [local, domain] = email.split("@");
  const domainParts = domain?.split(".");
  if (!local || !domainParts || domainParts.length < 2) return "Hidden";
  return `${local[0]}•••@${domainParts[0]}.${domainParts.slice(1).join(".")}`;
}

/** A reference is never sufficient: token lookup returns null for missing and invalid tokens. */
export async function findOrderForAccess(db: Db, reference: string, token: string): Promise<OrderDetail | null> {
  const detail = await findOrderByToken(db, token);
  return detail?.order.reference === reference ? detail : null;
}

type FindBookingDeps = { db?: Db; limiter?: RateLimiter; sms?: SmsSender; appUrl?: string; clientAddress: string };
export async function findMyBooking(reference: string, phone: string, deps: FindBookingDeps): Promise<{ ok: true; message: string } | { ok: false; code: "RATE_LIMITED" }> {
  const db = deps.db ?? getDb();
  const normalised = normaliseZambianMobile(phone);
  const referenceKey = typeof reference === "string" ? reference.trim().toUpperCase() : "";
  const limiter = deps.limiter ?? rateLimiter;
  const ipAllowed = await limiter.hit(`find-booking:ip:${deps.clientAddress}`, 5, 3600);
  const referenceAllowed = await limiter.hit(`find-booking:reference:${referenceKey}`, 3, 3600);
  if (!ipAllowed || !referenceAllowed) return { ok: false, code: "RATE_LIMITED" };
  if (normalised && referenceKey) {
    const [row] = await db.select().from(orders).where(and(eq(orders.reference, referenceKey), eq(orders.customerPhone, normalised)));
    if (row) {
      const appUrl = deps.appUrl ?? process.env.APP_URL;
      // Reissue a fresh private token, keeping only its hash in the database.
      const { randomBytes } = await import("node:crypto");
      const { hashToken } = await import("./orders");
      const token = randomBytes(32).toString("base64url");
      await db.update(orders).set({ accessTokenHash: hashToken(token) }).where(eq(orders.id, row.id));
      if (appUrl) {
        try { await (deps.sms ?? createSmsSender()).send({ to: normalised, text: `Your booking link: ${appUrl}/order/${encodeURIComponent(referenceKey)}?t=${encodeURIComponent(token)}` }); }
        catch { /* Keep the response indistinguishable from a non-match. */ }
      }
    }
  }
  return { ok: true, message: FIND_BOOKING_MESSAGE };
}
