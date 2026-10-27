import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { seedCatalogue } from "../../lib/catalogue/seed";
import { createTestDb } from "../../lib/db/test-db";
import { notificationLog, orders } from "../../lib/db/schema";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  callbacks: [] as (() => unknown)[],
}));

vi.mock("next/server", () => ({ after: (callback: () => unknown) => mocks.callbacks.push(callback) }));
vi.mock("../../lib/db", () => ({ getDb: () => mocks.db }));

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  test = await createTestDb();
  await seedCatalogue(test.db);
  mocks.db = test.db;
  mocks.callbacks = [];
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_URL", "https://cakes.test");
  vi.stubEnv("OWNER_EMAIL", "");
  vi.stubEnv("TWILIO_ACCOUNT_SID", `AC${"a".repeat(32)}`);
  vi.stubEnv("TWILIO_AUTH_TOKEN", "fake-twilio-token");
  vi.stubEnv("TWILIO_FROM", "+15005550006");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error for private@example.com +260977123456")));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await test.close();
});

function request() {
  return {
    cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8], addons: [] },
    fulfilment: "pickup",
    eventDate: "2026-11-30",
    timeWindow: "afternoon",
    name: "Sensitive Customer",
    phone: "0977 123 456",
    email: "private@example.com",
    privacyConsent: true,
  };
}

it("stores awaiting_payment and logs a real SMS provider failure without failing the booking", async () => {
  const logError = vi.spyOn(console, "error").mockImplementation(() => {});
  const logInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    vi.resetModules();
    const { createBookingAction } = await import("./actions");
    const result = await createBookingAction(request());
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;

    const [order] = await test.db.select().from(orders);
    expect(order.status).toBe("awaiting_payment");
    expect(mocks.callbacks).toHaveLength(1);
    await mocks.callbacks[0]();

    const rows = await test.db.select().from(notificationLog);
    expect(rows).toContainEqual(expect.objectContaining({
      orderId: order.id,
      event: "booking_received",
      channel: "sms",
      status: "failed",
      error: "Twilio request failed",
    }));
    expect(fetch).toHaveBeenCalledOnce();
    const logs = JSON.stringify([...logError.mock.calls, ...logInfo.mock.calls]);
    for (const value of ["Sensitive Customer", "private@example.com", "977123456", result.accessToken]) expect(logs).not.toContain(value);
  } finally {
    logError.mockRestore();
    logInfo.mockRestore();
  }
});
