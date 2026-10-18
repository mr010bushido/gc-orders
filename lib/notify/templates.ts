import type { Settings } from "../catalogue/settings";
import type { Order } from "../orders/orders";
import type { NotificationEvent } from "../db/schema/notifications";

/** The order fields templates read. Never the POP text or the customer's email. */
export type TemplateOrder = Pick<Order, "reference" | "fulfilment" | "eventDate" | "timeWindow" | "customerName" | "total" | "deposit">;
export type TemplateContext = {
  order: TemplateOrder;
  /** The order link, built from `APP_URL` and the customer's token, for events that send one. */
  link?: string;
  settings: Pick<Settings, "airtel_number" | "mtn_number" | "pickup_map_url">;
};
export type Message = { sms: string; subject: string; text: string; html: string };

const BRAND = "Giuseppe's Cakes";

export const money = (kwacha: number) => `K${kwacha.toLocaleString("en-US")}`;

const day = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

const clip = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}.` : value);
const firstName = (order: TemplateOrder) => clip(order.customerName?.trim().split(/\s+/)[0] || "there", 20);
const ownerName = (order: TemplateOrder) => clip(order.customerName?.trim() || "(anonymised)", 40);
const when = (order: TemplateOrder) => `${day(order.eventDate)} (${order.timeWindow})`;
const pickupPin = ({ order, settings }: TemplateContext) => (order.fulfilment === "pickup" && settings.pickup_map_url ? ` Pickup pin: ${settings.pickup_map_url}` : "");
const payTo = ({ settings }: TemplateContext) => [settings.airtel_number && `Airtel ${settings.airtel_number}`, settings.mtn_number && `MTN ${settings.mtn_number}`].filter(Boolean).join(" or ");
const linkTo = (context: TemplateContext, lead: string) => (context.link ? ` ${lead} ${context.link}` : "");

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
const toHtml = (text: string) => text.split("\n\n")
  .map(paragraph => `<p>${escapeHtml(paragraph).replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}">${url}</a>`)}</p>`).join("\n");

/** One SMS body, and an email that repeats it under a greeting. Kept plain so SMS stays within two GSM segments. */
function message(subject: string, sms: string, greeting?: string): Message {
  const text = greeting ? `${greeting}\n\n${sms}\n\n${BRAND}` : sms;
  return { sms, subject: `${subject} | ${BRAND}`, text, html: toHtml(text) };
}

export const TEMPLATES: Record<NotificationEvent, (context: TemplateContext) => Message> = {
  booking_received: (context) => {
    const { reference, deposit } = context.order;
    return message(`Booking ${reference} received`,
      `${BRAND}: booking ${reference} received. Pay the ${money(deposit)} deposit to ${payTo(context)}, then paste the payment SMS`
      + `${context.link ? ` at ${context.link}` : " on your order page"}.${pickupPin(context)}`,
      `Hi ${firstName(context.order)},`);
  },
  pop_received: ({ order }) => message(`Payment details received for ${order.reference}`,
    `${BRAND}: we have your payment details for ${order.reference}. We will confirm once the deposit is verified.`,
    `Hi ${firstName(order)},`),
  deposit_verified: (context) => {
    const { order } = context;
    return message(`Order ${order.reference} confirmed`,
      `${BRAND}: deposit verified, ${order.reference} is confirmed for ${when(order)}. Balance ${money(order.total - order.deposit)}`
      + ` due on ${order.fulfilment === "pickup" ? "collection" : "delivery"}.${pickupPin(context)}`,
      `Hi ${firstName(order)},`);
  },
  quote_ready: (context) => {
    const { order } = context;
    return message(`Your quote for ${order.reference}`,
      `${BRAND}: your quote for ${order.reference} is ready. Total ${money(order.total)}, deposit ${money(order.deposit)}.`
      + `${linkTo(context, "View and pay:")}`,
      `Hi ${firstName(order)},`);
  },
  order_expired: ({ order }) => message(`Booking ${order.reference} expired`,
    `${BRAND}: booking ${order.reference} has expired because the deposit was not received in time. Please book again if you still need it.`),
  owner_new_booking: ({ order }) => message(`New booking ${order.reference}`,
    `New booking ${order.reference}: ${ownerName(order)}, ${when(order)}, ${order.fulfilment}. Total ${money(order.total)}, deposit ${money(order.deposit)}.`),
  owner_new_quote_request: ({ order }) => message(`New quote request ${order.reference}`,
    `New quote request ${order.reference}: ${ownerName(order)}, ${when(order)}, ${order.fulfilment}.`),
  owner_pop_submitted: ({ order }) => message(`POP submitted for ${order.reference}`,
    `POP submitted for ${order.reference} (${ownerName(order)}). Please verify the deposit of ${money(order.deposit)}.`),
};
