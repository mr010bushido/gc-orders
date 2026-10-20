import { and, asc, desc, eq, gt, inArray, isNotNull, lt, lte, or, type SQL } from "drizzle-orm";
import type { Db } from "../db";
import { orderLines, orders, orderStatusEvents, popSubmissions } from "../db/schema";
import { ORDER_STATUSES, type OrderStatus } from "../db/schema/orders";

const ACTIVE: OrderStatus[] = ["awaiting_quote", "awaiting_payment", "awaiting_verification", "confirmed"];
export type OrdersFilter = { status?: OrderStatus | "active" | "all" | "flagged"; sort?: "asc" | "desc"; date?: string; cursor?: string; limit?: number; now?: Date };
export type OwnerOrderRow = Omit<typeof orders.$inferSelect, "accessTokenHash"> & { summary: string };
export type OwnerOrderDetail = OwnerOrderRow & {
  lines: (typeof orderLines.$inferSelect)[];
  submissions: (typeof popSubmissions.$inferSelect)[];
  events: (typeof orderStatusEvents.$inferSelect)[];
};

/** Load detail independently of list filters so a shared reference always opens its order. */
export async function getOwnerOrderDetail(db: Db, reference: string, now = new Date()): Promise<OwnerOrderDetail | null> {
  const [order] = await db.select({
    id: orders.id, reference: orders.reference, status: orders.status, fulfilment: orders.fulfilment,
    eventDate: orders.eventDate, timeWindow: orders.timeWindow, customerName: orders.customerName,
    customerPhone: orders.customerPhone, customerEmail: orders.customerEmail, deliveryAddress: orders.deliveryAddress,
    designNotes: orders.designNotes, topperMessage: orders.topperMessage, total: orders.total, deposit: orders.deposit,
    paymentDueAt: orders.paymentDueAt, flaggedAt: orders.flaggedAt, flagNote: orders.flagNote,
    balancePaidAt: orders.balancePaidAt, balanceMethod: orders.balanceMethod, balanceNote: orders.balanceNote,
    ownerSeenAt: orders.ownerSeenAt, anonymisedAt: orders.anonymisedAt, createdAt: orders.createdAt,
  }).from(orders).where(eq(orders.reference, reference)).limit(1);
  if (!order) return null;
  const [lines, submissions, events] = await Promise.all([
    db.select().from(orderLines).where(eq(orderLines.orderId, order.id)).orderBy(asc(orderLines.position)),
    db.select().from(popSubmissions).where(eq(popSubmissions.orderId, order.id)).orderBy(asc(popSubmissions.submittedAt)),
    db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, order.id)).orderBy(asc(orderStatusEvents.at)),
  ]);
  const status = order.status === "awaiting_payment" && order.paymentDueAt && order.paymentDueAt <= now ? "expired" : order.status;
  return { ...order, status, summary: lines.map(line => line.label).join(", ") || "Quote request", lines, submissions, events };
}

function parseCursor(cursor: string | undefined): { date: string; id: string } | null {
  if (!cursor) return null;
  try {
    const [date, id, extra] = Buffer.from(cursor, "base64url").toString().split("|");
    return extra === undefined && /^\d{4}-\d{2}-\d{2}$/.test(date) && /^[0-9a-f-]{36}$/i.test(id) ? { date, id } : null;
  } catch { return null; }
}

export function encodeOrdersCursor(row: Pick<typeof orders.$inferSelect, "eventDate" | "id">): string {
  return Buffer.from(`${row.eventDate}|${row.id}`).toString("base64url");
}

/** Returns one bounded page. The access token hash is excluded at the query seam; lapsed payment rows use effective status. */
export async function listOwnerOrders(db: Db, filter: OrdersFilter = {}): Promise<{ orders: OwnerOrderRow[]; nextCursor: string | null }> {
  const now = filter.now ?? new Date();
  const sort = filter.sort === "desc" ? "desc" : "asc";
  const limit = Math.max(1, Math.min(filter.limit ?? 100, 100));
  const conditions: SQL[] = [];
  const expired = or(eq(orders.status, "expired"), and(eq(orders.status, "awaiting_payment"), lte(orders.paymentDueAt, now)))!;
  const effective = (status: OrderStatus): SQL => status === "expired" ? expired
    : status === "awaiting_payment" ? and(eq(orders.status, status), gt(orders.paymentDueAt, now))!
    : eq(orders.status, status);
  const selected = filter.status ?? "active";
  const hasDate = Boolean(filter.date && /^\d{4}-\d{2}-\d{2}$/.test(filter.date));
  if (hasDate) conditions.push(eq(orders.eventDate, filter.date!));
  else if (selected === "active") conditions.push(or(...ACTIVE.map(effective))!);
  else if (selected === "flagged") conditions.push(isNotNull(orders.flaggedAt));
  else if (selected === "all") { /* no status filter */ }
  else if ((ORDER_STATUSES as readonly string[]).includes(selected)) conditions.push(effective(selected as OrderStatus));
  else conditions.push(or(...ACTIVE.map(effective))!);
  const cursor = parseCursor(filter.cursor);
  if (cursor) conditions.push(sort === "asc"
    ? or(gt(orders.eventDate, cursor.date), and(eq(orders.eventDate, cursor.date), gt(orders.id, cursor.id)))!
    : or(lt(orders.eventDate, cursor.date), and(eq(orders.eventDate, cursor.date), gt(orders.id, cursor.id)))!);
  const rows = await db.select({
    id: orders.id, reference: orders.reference, status: orders.status, fulfilment: orders.fulfilment,
    eventDate: orders.eventDate, timeWindow: orders.timeWindow, customerName: orders.customerName,
    customerPhone: orders.customerPhone, customerEmail: orders.customerEmail, deliveryAddress: orders.deliveryAddress,
    designNotes: orders.designNotes, topperMessage: orders.topperMessage, total: orders.total, deposit: orders.deposit,
    paymentDueAt: orders.paymentDueAt, flaggedAt: orders.flaggedAt, flagNote: orders.flagNote,
    balancePaidAt: orders.balancePaidAt, balanceMethod: orders.balanceMethod, balanceNote: orders.balanceNote,
    ownerSeenAt: orders.ownerSeenAt, anonymisedAt: orders.anonymisedAt, createdAt: orders.createdAt,
  }).from(orders).where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sort === "asc" ? asc(orders.eventDate) : desc(orders.eventDate), asc(orders.id)).limit(limit + 1);
  const page = rows.slice(0, limit);
  const summaries = page.length ? await db.select({ orderId: orderLines.orderId, label: orderLines.label })
    .from(orderLines).where(inArray(orderLines.orderId, page.map(row => row.id))).orderBy(asc(orderLines.position)) : [];
  const labels = new Map<string, string[]>();
  for (const line of summaries) labels.set(line.orderId, [...(labels.get(line.orderId) ?? []), line.label]);
  const result = page.map(row => ({ ...row, status: row.status === "awaiting_payment" && row.paymentDueAt && row.paymentDueAt <= now ? "expired" : row.status, summary: labels.get(row.id)?.join(", ") ?? "Quote request" }));
  return { orders: result, nextCursor: rows.length > limit && page.length ? encodeOrdersCursor(page[page.length - 1]) : null };
}
