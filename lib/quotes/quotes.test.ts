import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { orderLines } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { OrderError } from "../orders/orders";
import { declineQuote, sendQuote } from "./quotes";

const databases: Awaited<ReturnType<typeof createTestDb>>[] = [];
afterEach(async () => { await Promise.all(databases.splice(0).map(test => test.close())); });

async function quoteOrder(empty = true) {
  const test = await createTestDb(); databases.push(test);
  const input = empty ? orderInput({ requestsQuote: true, basket: { lines: [], total: 0, deposit: 0 } })
    : orderInput({ requestsQuote: true });
  return { test, order: (await createOrder(test.db, input, BOOKED_AT)).order };
}

describe("quote pricing", () => {
  it("sends a quote, starts the 24 hour payment clock and rejects a second send", async () => {
    const { test, order } = await quoteOrder();
    const now = new Date("2026-10-17T08:00:00Z");
    const sent = await sendQuote(test.db, order.id, [{ label: "Wedding cake, 3 tier", amount: 6000 }], now);
    expect(sent).toMatchObject({ status: "awaiting_payment", total: 6000, deposit: 3000, paymentDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) });
    await expect(sendQuote(test.db, order.id, [{ label: "Second", amount: 10 }], now)).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    expect(await test.db.select().from(orderLines).where(eq(orderLines.orderId, order.id))).toHaveLength(1);
  });

  it("includes priced order lines when calculating the quote deposit", async () => {
    const { test, order } = await quoteOrder(false);
    const sent = await sendQuote(test.db, order.id, [{ label: "Toppings", amount: 500 }], BOOKED_AT);
    expect(sent).toMatchObject({ total: 1540, deposit: 770 });
  });

  it("validates quote lines and declines without notifying", async () => {
    const { test, order } = await quoteOrder();
    await expect(sendQuote(test.db, order.id, [], BOOKED_AT)).rejects.toMatchObject({ code: "QUOTE_LINES_REQUIRED" });
    await expect(sendQuote(test.db, order.id, [{ label: "x", amount: 12.5 }], BOOKED_AT)).rejects.toMatchObject({ code: "INVALID_QUOTE_LINE" });
    expect((await declineQuote(test.db, order.id, BOOKED_AT)).status).toBe("expired");
    await expect(sendQuote(test.db, order.id, [{ label: "Cake", amount: 100 }], BOOKED_AT)).rejects.toBeInstanceOf(OrderError);
  });
});
