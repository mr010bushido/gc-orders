import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { notificationLog, settings } from "../db/schema";
import type { NotificationEvent } from "../db/schema/notifications";
import { createTestDb } from "../db/test-db";
import { BOOKED_AT, orderInput } from "../orders/fixtures";
import { createOrder } from "../orders/orders";
import { notify, ROUTES, type NotifyDeps } from "./notify";

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => {
  test = await createTestDb();
  await test.db.insert(settings).values({ key: "owner_alert_phone", value: "0966 222 440" });
});
afterAll(async () => { await test.close(); });

const sms = { send: vi.fn() };
const email = { send: vi.fn() };
const error = vi.spyOn(console, "error").mockImplementation(() => {});
beforeEach(() => {
  sms.send.mockReset().mockResolvedValue({ id: "SM1" });
  email.send.mockReset().mockResolvedValue({ id: "em_1" });
  error.mockClear();
});
const deps = (): Partial<NotifyDeps> => ({ db: test.db, sms, email, ownerEmail: "owner@example.com", appUrl: "https://cakes.test", now: () => BOOKED_AT });

const newOrder = async () => {
  const { order, accessToken } = await createOrder(test.db, orderInput(), BOOKED_AT);
  return { order, token: accessToken };
};
const log = (orderId: string) => test.db.select().from(notificationLog).where(eq(notificationLog.orderId, orderId));

it.each(Object.entries(ROUTES) as [NotificationEvent, (typeof ROUTES)[NotificationEvent]][])("%s goes to the %s on its channels", async (event, route) => {
  const { order, token } = await newOrder();
  await notify(event, { order, token }, deps());
  const customer = route.to === "customer";
  expect(sms.send).toHaveBeenCalledExactlyOnceWith({ to: customer ? "+260977123456" : "+260966222440", text: expect.stringContaining(order.reference) });
  if (route.channels.includes("email")) {
    expect(email.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: customer ? "mwila@example.com" : "owner@example.com" }));
  } else {
    expect(email.send).not.toHaveBeenCalled();
  }
  const rows = await log(order.id);
  expect(rows.map(row => [row.event, row.channel, row.status, row.recipient]).sort()).toEqual(route.channels.map(channel => [event, channel, "sent",
    channel === "sms" ? (customer ? "+260 ••• ••• 456" : "+260 ••• ••• 440") : (customer ? "•••@example.com" : "•••@example.com")]).sort());
  expect(rows.map(row => row.providerMessageId).sort()).toEqual(route.channels.map(channel => (channel === "sms" ? "SM1" : "em_1")).sort());
});

it("puts the tokenised order link in the booking message", async () => {
  const { order, token } = await newOrder();
  await notify("booking_received", { order, token }, deps());
  expect(sms.send.mock.calls[0][0].text).toContain(`https://cakes.test/order/${order.reference}?t=${token}`);
});

it("skips the owner SMS when the alert phone is unset and still sends the email", async () => {
  await test.db.update(settings).set({ value: null }).where(eq(settings.key, "owner_alert_phone"));
  try {
    const { order } = await newOrder();
    await notify("owner_pop_submitted", { order }, deps());
    expect(sms.send).not.toHaveBeenCalled();
    expect(email.send).toHaveBeenCalledOnce();
    expect((await log(order.id)).map(row => [row.channel, row.status]).sort()).toEqual([["email", "sent"], ["sms", "skipped"]]);
  } finally {
    await test.db.update(settings).set({ value: "0966 222 440" }).where(eq(settings.key, "owner_alert_phone"));
  }
});

it("skips the owner email when OWNER_EMAIL is unset", async () => {
  const { order } = await newOrder();
  await notify("owner_new_booking", { order }, { ...deps(), ownerEmail: "" });
  expect(email.send).not.toHaveBeenCalled();
  expect((await log(order.id)).map(row => [row.channel, row.status]).sort()).toEqual([["email", "skipped"], ["sms", "sent"]]);
});

it("sends a once-only event once however often it is triggered", async () => {
  const { order } = await newOrder();
  await notify("deposit_verified", { order }, deps());
  await Promise.all([notify("deposit_verified", { order }, deps()), notify("deposit_verified", { order }, deps())]);
  expect(sms.send).toHaveBeenCalledOnce();
  expect(email.send).toHaveBeenCalledOnce();
  expect(await log(order.id)).toHaveLength(2);
});

it("sends POP messages again on a resubmission", async () => {
  const { order } = await newOrder();
  await notify("pop_received", { order }, deps());
  await notify("pop_received", { order }, deps());
  expect(sms.send).toHaveBeenCalledTimes(2);
  expect(await log(order.id)).toHaveLength(4);
});

it("logs a provider failure without the secret, still sends the other channel and does not throw", async () => {
  const sid = "AC" + "0123456789abcdef".repeat(2);
  sms.send.mockRejectedValue(new Error(`Twilio says account ${sid} cannot reach +260977123456`));
  const { order, token } = await newOrder();
  await expect(notify("booking_received", { order, token }, deps())).resolves.toBeUndefined();
  expect(email.send).toHaveBeenCalledOnce();
  const [failed] = (await log(order.id)).filter(row => row.channel === "sms");
  expect(failed).toMatchObject({ status: "failed", providerMessageId: null });
  expect(failed.error).toContain("Twilio says account");
  expect(failed.error).not.toContain(sid);
  expect(failed.error).not.toContain("977123");
});

it("never throws when the database is unavailable", async () => {
  const { order } = await newOrder();
  const broken = { select: () => { throw new Error("connect ECONNREFUSED postgres://app:hunter2@db/cakes"); } } as unknown as NotifyDeps["db"];
  await expect(notify("pop_received", { order }, { ...deps(), db: broken })).resolves.toBeUndefined();
  expect(sms.send).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledOnce();
  expect(error.mock.calls.join()).not.toContain("hunter2");
});

it("skips the channels of an anonymised order", async () => {
  const { order } = await newOrder();
  await notify("order_expired", { order: { ...order, customerPhone: null, customerEmail: null } }, deps());
  expect(sms.send).not.toHaveBeenCalled();
  expect(await log(order.id)).toMatchObject([{ channel: "sms", status: "skipped", recipient: "" }]);
});
