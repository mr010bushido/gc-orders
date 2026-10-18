import { eq, inArray } from "drizzle-orm";
import { getDb, type Db } from "../db";
import { notificationLog, settings as settingsTable } from "../db/schema";
import type { Channel, NotificationEvent } from "../db/schema/notifications";
import { resolveSettings, type Settings } from "../catalogue/settings";
import type { Order } from "../orders/orders";
import { normaliseZambianMobile } from "../phone";
import { createEmailSender, type EmailSender } from "./email";
import { maskEmail, maskPhone, summariseError } from "./mask";
import { createSmsSender, type SmsSender } from "./sms";
import { TEMPLATES, type TemplateOrder } from "./templates";

type Recipient = "customer" | "owner";

/** Who gets each event and on which channels (PBS D1, D2, Q10). */
export const ROUTES: Record<NotificationEvent, { to: Recipient; channels: readonly Channel[] }> = {
  booking_received: { to: "customer", channels: ["sms", "email"] },
  pop_received: { to: "customer", channels: ["sms", "email"] },
  deposit_verified: { to: "customer", channels: ["sms", "email"] },
  quote_ready: { to: "customer", channels: ["sms", "email"] },
  order_expired: { to: "customer", channels: ["sms"] },
  owner_new_booking: { to: "owner", channels: ["sms", "email"] },
  owner_new_quote_request: { to: "owner", channels: ["sms", "email"] },
  owner_pop_submitted: { to: "owner", channels: ["sms", "email"] },
};

export type NotifyOrder = TemplateOrder & Pick<Order, "id" | "customerPhone" | "customerEmail">;
/** Events whose message links to the order need the customer's plaintext token, available only when it is issued. */
export type NotifyContext<E extends NotificationEvent> = E extends "booking_received" | "quote_ready"
  ? { order: NotifyOrder; token: string } : { order: NotifyOrder };

export type NotifyDeps = { db: Db; sms: SmsSender; email: EmailSender; ownerEmail?: string; appUrl?: string; now: () => Date };

const SETTING_KEYS = ["airtel_number", "mtn_number", "pickup_map_url", "owner_alert_phone"] as const;

/**
 * Sends an event's messages and logs one row per channel. Never throws: failures are logged as `failed`, missing
 * recipients as `skipped`, and a once-only event that already has a row for an order and channel sends nothing.
 */
export async function notify<E extends NotificationEvent>(event: E, context: NotifyContext<E>, deps: Partial<NotifyDeps> = {}): Promise<void> {
  try {
    const db = deps.db ?? getDb();
    const now = deps.now ?? (() => new Date());
    const rows = await db.select({ key: settingsTable.key, value: settingsTable.value }).from(settingsTable)
      .where(inArray(settingsTable.key, [...SETTING_KEYS]));
    const settings = resolveSettings(rows);
    const { order } = context;
    const appUrl = deps.appUrl ?? process.env.APP_URL;
    // Without an origin a link would be relative and useless in an SMS; templates then point to the order page in words.
    const link = "token" in context && appUrl ? `${appUrl}/order/${encodeURIComponent(order.reference)}?t=${encodeURIComponent(context.token)}` : undefined;
    const message = TEMPLATES[event]({ order, link, settings });
    const route = ROUTES[event];
    for (const channel of route.channels) {
      // Each channel stands alone: a database or provider error on one must not stop the other.
      try {
        const to = recipient(route.to, channel, order, settings, deps.ownerEmail ?? process.env.OWNER_EMAIL);
        await deliver(db, now, { orderId: order.id, event, channel }, to, async (address) => channel === "sms"
          ? (deps.sms ?? createSmsSender()).send({ to: address, text: message.sms })
          : (deps.email ?? createEmailSender()).send({ to: address, subject: message.subject, text: message.text, html: message.html }));
      } catch (error) {
        console.error(`notify ${event} ${channel} failed: ${summariseError(error)}`);
      }
    }
  } catch (error) {
    console.error(`notify ${event} failed: ${summariseError(error)}`);
  }
}

function recipient(to: Recipient, channel: Channel, order: NotifyOrder, settings: Settings, ownerEmail: string | undefined) {
  const value = to === "customer"
    ? (channel === "sms" ? order.customerPhone : order.customerEmail)
    : (channel === "sms" ? normaliseZambianMobile(settings.owner_alert_phone ?? "") : ownerEmail);
  return value?.trim() || null;
}

type Key = { orderId: string; event: NotificationEvent; channel: Channel };

async function deliver(db: Db, now: () => Date, key: Key, to: string | null, send: (to: string) => Promise<{ id: string }>) {
  const masked = to === null ? "" : key.channel === "sms" ? maskPhone(to) : maskEmail(to);
  // Claim the row before sending so a duplicate trigger (sequential or concurrent) hits the unique index and sends
  // nothing. The claim reads `failed` until the send succeeds, so a crash mid-send leaves a truthful row.
  const [claimed] = await db.insert(notificationLog).values({
    ...key, recipient: masked, at: now(),
    ...(to === null ? { status: "skipped" as const, error: "no recipient configured" } : { status: "failed" as const, error: "not sent" }),
  }).onConflictDoNothing().returning({ id: notificationLog.id });
  if (!claimed || to === null) return;
  let id: string;
  try {
    ({ id } = await send(to));
  } catch (error) {
    await db.update(notificationLog).set({ error: summariseError(error), at: now() }).where(eq(notificationLog.id, claimed.id));
    return;
  }
  // The provider accepted the message: a failure here must not mark it failed. The caller logs it.
  await db.update(notificationLog).set({ status: "sent", providerMessageId: id, error: null, at: now() })
    .where(eq(notificationLog.id, claimed.id));
}
