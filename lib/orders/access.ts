import { and, eq, isNull } from "drizzle-orm";
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

type FindBookingDeps = { db?: Db; limiter?: RateLimiter; sms?: SmsSender; appUrl?: string; clientAddress: string; schedule: (work: () => Promise<void>) => void };
export async function findMyBooking(reference: string, phone: string, deps: FindBookingDeps): Promise<{ ok: true; message: string } | { ok: false; code: "RATE_LIMITED" }> {
  const db = deps.db ?? getDb();
  const normalised = normaliseZambianMobile(phone);
  const referenceKey = typeof reference === "string" ? reference.trim().toUpperCase() : "";
  const limiter = deps.limiter ?? rateLimiter;
  const ipAllowed = await limiter.hit(`find-booking:ip:${deps.clientAddress}`, 5, 3600);
  if (!ipAllowed) return { ok: false, code: "RATE_LIMITED" };
  const referenceAllowed = await limiter.hit(`find-booking:reference:${referenceKey}`, 3, 3600);
  if (!referenceAllowed) return { ok: false, code: "RATE_LIMITED" };
  if (normalised && referenceKey) deps.schedule(() => lookupAndSend(referenceKey, normalised, deps, db));
  return { ok: true, message: FIND_BOOKING_MESSAGE };
}

async function lookupAndSend(referenceKey: string, normalised: string, deps: FindBookingDeps, db: Db): Promise<void> {
  try {
    const appUrl = deps.appUrl ?? process.env.APP_URL;
    if (!appUrl) return;
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(orders).where(and(eq(orders.reference, referenceKey), eq(orders.customerPhone, normalised), isNull(orders.anonymisedAt))).for("update");
      if (!row) return;
      // Reissue a fresh private token, keeping only its hash in the database.
      const { randomBytes } = await import("node:crypto");
      const { hashToken } = await import("./orders");
      const token = randomBytes(32).toString("base64url");
      const oldHash = row.accessTokenHash;
      const newHash = hashToken(token);
      const [rotated] = await tx.update(orders).set({ accessTokenHash: newHash })
        .where(and(eq(orders.id, row.id), eq(orders.accessTokenHash, oldHash))).returning({ id: orders.id });
      if (!rotated) return;
      try {
        await (deps.sms ?? createSmsSender()).send({ to: normalised, text: `Your booking link: ${appUrl}/order/${encodeURIComponent(referenceKey)}?t=${encodeURIComponent(token)}` });
      } catch {
        await tx.update(orders).set({ accessTokenHash: oldHash }).where(and(eq(orders.id, row.id), eq(orders.accessTokenHash, newHash)));
        console.error("find-my-booking SMS failed");
      }
    });
  } catch {
    console.error("find-my-booking lookup failed");
  }
}
