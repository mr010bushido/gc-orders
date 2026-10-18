import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { orders } from "../db/schema";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "./fixtures";
import { createOrder, effectiveStatus, findOrderByToken, getOrder, getTimeline } from "./orders";
import { setFlag, submitPop, transition } from "./transitions";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { test = await createTestDb(); });
afterAll(async () => { await test.close(); });

const MINUTE = 60_000;
const at = (hours: number) => new Date(BOOKED_AT.getTime() + hours * 3600_000);

it("treats an unpaid order past its deadline as expired before the job runs", async () => {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  expect(effectiveStatus(order, new Date(order.paymentDueAt!.getTime() - MINUTE))).toBe("awaiting_payment");
  expect(effectiveStatus(order, new Date(order.paymentDueAt!.getTime() + 5 * MINUTE))).toBe("expired");
});

it("never lapses a flagged order awaiting verification", async () => {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await submitPop(test.db, order.id, "Airtel K520 sent, TID 123", at(1));
  const flagged = await setFlag(test.db, order.id, "Check amount", at(2));
  expect(effectiveStatus(flagged, at(72))).toBe("awaiting_verification");
  expect(effectiveStatus({ status: "awaiting_quote", paymentDueAt: null }, at(72))).toBe("awaiting_quote");
});

it("lists the timeline with actors in time order", async () => {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await submitPop(test.db, order.id, "Airtel K520 sent, TID 123", at(1));
  await transition(test.db, order.id, "verify", "owner", at(2));
  expect(await getTimeline(test.db, order.id)).toMatchObject([
    { fromStatus: null, toStatus: "awaiting_payment", actor: "system", at: BOOKED_AT },
    { fromStatus: "awaiting_payment", toStatus: "awaiting_verification", actor: "customer", at: at(1) },
    { fromStatus: "awaiting_verification", toStatus: "confirmed", actor: "owner", at: at(2) },
  ]);
});

it("orders same-instant events by the lifecycle", async () => {
  const { order } = await createOrder(test.db, orderInput(), BOOKED_AT);
  await submitPop(test.db, order.id, "Airtel K520 sent, TID 123", BOOKED_AT);
  await transition(test.db, order.id, "verify", "owner", BOOKED_AT);
  expect((await getTimeline(test.db, order.id)).map(event => event.toStatus)).toEqual(["awaiting_payment", "awaiting_verification", "confirmed"]);
});

it("finds an order by its token and nothing by a wrong one", async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const detail = await findOrderByToken(test.db, accessToken);
  expect(detail).toMatchObject({ order: { id: order.id }, lines: [{ kind: "cake" }] });
  expect(detail?.order).not.toHaveProperty("accessTokenHash");
  expect((await getOrder(test.db, order.id))?.order).not.toHaveProperty("accessTokenHash");
  const wrong = (accessToken[0] === "A" ? "B" : "A") + accessToken.slice(1);
  for (const token of [wrong, "", "short", order.accessTokenHash, `${accessToken}=`]) {
    expect(await findOrderByToken(test.db, token)).toBeNull();
  }
});

it("has no column that could hold the plaintext token", async () => {
  const { accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  const columns = (await test.client.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'orders'")).rows.map(row => row.column_name);
  expect(columns.filter(name => name.includes("token"))).toEqual(["access_token_hash"]);
  const rows = await test.db.select().from(orders).where(eq(orders.status, "awaiting_payment"));
  expect(JSON.stringify(rows)).not.toContain(accessToken);
});
