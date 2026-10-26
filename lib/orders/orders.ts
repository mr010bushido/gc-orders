import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db";
import { orderImages, orderLines, orders, orderStatusEvents, popSubmissions, settings } from "../db/schema";
import { FULFILMENTS, LINE_KINDS, ORDER_STATUSES, TIME_WINDOWS, type OrderStatus } from "../db/schema/orders";
import { resolveSettings } from "../catalogue/settings";
import { normaliseZambianMobile } from "../phone";
import { parseLineMeta } from "./line-meta";
import { allocateReference } from "./reference";

const HOUR = 60 * 60 * 1000;

export type OrderErrorCode = "ORDER_INVALID" | "PHONE_INVALID" | "DELIVERY_ADDRESS_REQUIRED" | "ORDER_NOT_FOUND"
  | "INVALID_TRANSITION" | "ORDER_EXPIRED" | "POP_TEXT_INVALID" | "BALANCE_ALREADY_PAID" | "IMAGE_NOT_FOUND";

export class OrderError extends Error {
  constructor(public readonly code: OrderErrorCode, message: string = code) {
    super(message);
    this.name = "OrderError";
  }
}

export type Order = typeof orders.$inferSelect;
export type OrderLine = typeof orderLines.$inferSelect;
export type OrderDetail = { order: Omit<Order, "accessTokenHash">; lines: OrderLine[]; currentPop: { text: string; submittedAt: Date } | null };

const optionalText = (max: number) => z.string().trim().max(max).optional();

const createOrderInput = z.object({
  customer: z.object({ name: z.string().trim().min(1).max(200), phone: z.string(), email: z.email().max(254) }),
  fulfilment: z.enum(FULFILMENTS),
  deliveryAddress: optionalText(500),
  eventDate: z.iso.date(),
  timeWindow: z.enum(TIME_WINDOWS),
  designNotes: optionalText(2000),
  topperMessage: optionalText(200),
  requestsQuote: z.boolean().default(false),
  imageTokens: z.array(z.string().regex(/^[A-Za-z0-9_-]{22}$/)).max(3).default([]),
  basket: z.object({
    lines: z.array(z.object({
      kind: z.enum(LINE_KINDS),
      label: z.string().trim().min(1).max(200),
      quantity: z.number().int().positive(),
      unitAmount: z.number().int().nonnegative(),
      amount: z.number().int().nonnegative(),
      meta: z.unknown().optional(),
    })),
    total: z.number().int().nonnegative(),
    deposit: z.number().int().nonnegative(),
  }),
});

/** A `priceBasket` result with each line's `meta` attached, plus the customer's booking details. */
export type CreateOrderInput = z.input<typeof createOrderInput>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isOrderId = (id: unknown): id is string => typeof id === "string" && UUID.test(id);

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function paymentExpiryHours(db: Db): Promise<number> {
  const rows = await db.select({ key: settings.key, value: settings.value }).from(settings).where(eq(settings.key, "payment_expiry_hours"));
  return resolveSettings(rows).payment_expiry_hours;
}

/** Stores a priced basket as an order in one transaction. Returns the order and the plaintext access token, which is not stored. */
export async function createOrder(db: Db, input: CreateOrderInput, now: Date): Promise<{ order: Order; lines: OrderLine[]; accessToken: string }> {
  const parsed = createOrderInput.safeParse(input);
  if (!parsed.success) throw new OrderError("ORDER_INVALID", "order input is invalid");
  const data = parsed.data;
  const phone = normaliseZambianMobile(data.customer.phone);
  if (!phone) throw new OrderError("PHONE_INVALID");
  if (data.fulfilment === "delivery" && !data.deliveryAddress) throw new OrderError("DELIVERY_ADDRESS_REQUIRED");
  const { lines, total, deposit } = data.basket;
  let metas: Record<string, unknown>[];
  try {
    metas = lines.map(line => parseLineMeta(line.kind, line.meta ?? {}));
  } catch {
    throw new OrderError("ORDER_INVALID", "line meta does not match its kind");
  }
  // Up to three rounded lines can shift the displayed total by 1.5 Kwacha from the unrounded total used for the deposit.
  if ((lines.length === 0 && !data.requestsQuote) || lines.reduce((sum, line) => sum + line.amount, 0) !== total || deposit > total
    || (!data.requestsQuote && (lines.some(line => line.kind === "delivery") !== (data.fulfilment === "delivery")
      || deposit <= 0 || deposit < Math.floor(total / 2) - 1 || deposit > Math.ceil(total / 2) + 1))) {
    throw new OrderError("ORDER_INVALID", "basket lines, delivery and deposit must match the priced order");
  }

  const accessToken = randomBytes(32).toString("base64url");
  const status = data.requestsQuote ? "awaiting_quote" : "awaiting_payment";
  return db.transaction(async (tx) => {
    const paymentDueAt = status === "awaiting_payment" ? new Date(now.getTime() + (await paymentExpiryHours(tx)) * HOUR) : null;
    const [order] = await tx.insert(orders).values({
      reference: await allocateReference(tx, now),
      accessTokenHash: hashToken(accessToken),
      status,
      fulfilment: data.fulfilment,
      eventDate: data.eventDate,
      timeWindow: data.timeWindow,
      customerName: data.customer.name,
      customerPhone: phone,
      customerEmail: data.customer.email,
      deliveryAddress: data.fulfilment === "delivery" ? data.deliveryAddress! : "",
      designNotes: data.designNotes ?? "",
      topperMessage: data.topperMessage ?? "",
      total,
      deposit,
      paymentDueAt,
      createdAt: now,
    }).returning();
    const stored = lines.length === 0 ? [] : await tx.insert(orderLines).values(lines.map((line, position) => ({
      orderId: order.id, position, kind: line.kind, label: line.label, quantity: line.quantity,
      unitAmount: line.unitAmount, amount: line.amount, meta: metas[position],
    }))).returning();
    await tx.insert(orderStatusEvents).values({ orderId: order.id, fromStatus: null, toStatus: status, actor: "system", at: now });
    for (const token of data.imageTokens) {
      const attached = await tx.update(orderImages).set({ orderId: order.id })
        .where(and(eq(orderImages.tokenHash, hashToken(token)), isNull(orderImages.orderId), isNull(orderImages.deletingAt))).returning({ id: orderImages.id });
      if (attached.length !== 1) throw new OrderError("IMAGE_NOT_FOUND");
    }
    return { order, lines: stored, accessToken };
  });
}

/** Reads an order with its line snapshot and latest POP, or null. Never touches the catalogue. */
export async function getOrder(db: Db, id: string): Promise<OrderDetail | null> {
  if (!isOrderId(id)) return null;
  const [stored] = await db.select().from(orders).where(eq(orders.id, id));
  if (!stored) return null;
  const { accessTokenHash: _accessTokenHash, ...order } = stored;
  void _accessTokenHash;
  const [lines, [pop]] = await Promise.all([
    db.select().from(orderLines).where(eq(orderLines.orderId, id)).orderBy(asc(orderLines.position)),
    db.select({ text: popSubmissions.text, submittedAt: popSubmissions.submittedAt }).from(popSubmissions)
      .where(eq(popSubmissions.orderId, id)).orderBy(desc(popSubmissions.submittedAt)).limit(1),
  ]);
  return {
    order,
    lines: lines.map(line => ({ ...line, meta: parseLineMeta(line.kind, line.meta) })),
    currentPop: pop ?? null,
  };
}

/** Looks an order up by the customer's link token. Only the SHA-256 is stored, so the database compares hashes, never the token. */
export async function findOrderByToken(db: Db, token: string): Promise<OrderDetail | null> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [row] = await db.select({ id: orders.id }).from(orders).where(eq(orders.accessTokenHash, hashToken(token)));
  return row ? getOrder(db, row.id) : null;
}

/** The status to show: an unpaid order past its deadline reads as expired before the expiry job has run. */
export function effectiveStatus(order: Pick<Order, "status" | "paymentDueAt">, now: Date): OrderStatus {
  return order.status === "awaiting_payment" && order.paymentDueAt && order.paymentDueAt <= now ? "expired" : order.status;
}

/** Status events in time order; same-instant events follow the lifecycle, whose transitions only move forward in `ORDER_STATUSES`. */
export async function getTimeline(db: Db, orderId: string): Promise<(typeof orderStatusEvents.$inferSelect)[]> {
  if (!isOrderId(orderId)) return [];
  const events = await db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, orderId)).orderBy(asc(orderStatusEvents.at));
  const rank = (status: OrderStatus) => ORDER_STATUSES.indexOf(status);
  return events.sort((a, b) => a.at.getTime() - b.at.getTime() || rank(a.toStatus) - rank(b.toStatus));
}
