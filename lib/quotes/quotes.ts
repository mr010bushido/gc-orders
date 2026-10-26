import { asc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getCatalogue } from "../catalogue/catalogue";
import { toPricingRules } from "../catalogue/pricing-rules";
import type { Db } from "../db";
import { orderLines, orders, quoteRequests } from "../db/schema";
import { priceBasket } from "../basket-pricing";
import { OrderError } from "../orders/orders";
import { transition } from "../orders/transitions";
import { hashToken } from "../orders/orders";

const linesSchema = z.array(z.object({ label: z.string().trim().min(1).max(200), amount: z.number().int().positive() })).max(5);
export type QuoteLineInput = z.input<typeof linesSchema>[number];

/** Prices and sends an awaiting quote in one transaction. */
export async function sendQuote(db: Db, orderId: string, input: unknown, now: Date) {
  const parsed = linesSchema.safeParse(input);
  if (!parsed.success) throw new OrderError("INVALID_QUOTE_LINE");
  if (parsed.data.length === 0) throw new OrderError("QUOTE_LINES_REQUIRED");
  return db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order) throw new OrderError("ORDER_NOT_FOUND");
    const existing = await tx.select().from(orderLines).where(eq(orderLines.orderId, orderId)).orderBy(asc(orderLines.position));
    const catalogue = await getCatalogue(tx);
    const priced = priceBasket({
      quoteLines: [...existing.map(line => ({ label: line.label, amount: line.amount })), ...parsed.data],
      delivery: false,
      eventDate: order.eventDate,
    }, now, toPricingRules(catalogue));
    const start = existing.length;
    await tx.insert(orderLines).values(parsed.data.map((line, index) => ({
      orderId, position: start + index, kind: "quote" as const, label: line.label, quantity: 1,
      unitAmount: line.amount, amount: line.amount, meta: {},
    })));
    const token = randomBytes(32).toString("base64url");
    await tx.update(orders).set({ total: priced.total, deposit: priced.deposit, accessTokenHash: hashToken(token) }).where(eq(orders.id, orderId));
    return { order: await transition(tx, orderId, "send_quote", "owner", now), token };
  });
}

/** Declines an unpriced request silently. */
export async function declineQuote(db: Db, orderId: string, now: Date) {
  return transition(db, orderId, "decline", "owner", now);
}

export async function getQuoteRequest(db: Db, orderId: string) {
  const [request] = await db.select().from(quoteRequests).where(eq(quoteRequests.orderId, orderId));
  return request ?? null;
}
