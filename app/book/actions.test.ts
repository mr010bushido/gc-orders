import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { seedCatalogue } from "../../lib/catalogue/seed";
import { createTestDb } from "../../lib/db/test-db";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  callbacks: [] as (() => unknown)[],
  notify: vi.fn(),
}));

vi.mock("next/server", () => ({ after: (callback: () => unknown) => mocks.callbacks.push(callback) }));
vi.mock("../../lib/db", () => ({ getDb: () => mocks.db }));
vi.mock("../../lib/notify/notify", () => ({ notify: (...args: unknown[]) => mocks.notify(...args) }));

let test: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  test = await createTestDb();
  await seedCatalogue(test.db);
  mocks.db = test.db;
  mocks.callbacks = [];
  mocks.notify.mockReset().mockResolvedValue(undefined);
});
afterEach(async () => { await test.close(); });

function request(overrides: Record<string, unknown> = {}) {
  return {
    cake: { flavour: "vanilla", frosting: "american_buttercream", tierSizes: [8], addons: [] },
    fulfilment: "pickup",
    eventDate: "2026-11-30",
    timeWindow: "afternoon",
    name: "Sensitive Customer",
    phone: "0977 123 456",
    email: "private@example.com",
    ...overrides,
  };
}

async function action() {
  vi.resetModules();
  return import("./actions");
}

it("returns the committed booking before scheduling both notifications", async () => {
  const { createBookingAction } = await action();
  const result = await createBookingAction(request());
  expect(result).toMatchObject({ ok: true });
  expect(mocks.callbacks).toHaveLength(1);
  expect(mocks.notify).not.toHaveBeenCalled();

  await mocks.callbacks[0]();
  expect(mocks.notify).toHaveBeenCalledTimes(2);
  expect(mocks.notify.mock.calls.map(([event]) => event).sort()).toEqual(["booking_received", "owner_new_booking"]);
  expect(mocks.notify.mock.calls[0][2].db).toBe(test.db);
});

it("does not log customer fields or tokens for validation or notification failures", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const { createBookingAction } = await action();
    const invalid = await createBookingAction(request({ name: "", phone: "12345" }));
    expect(invalid).toMatchObject({ ok: false });
    expect(log).not.toHaveBeenCalled();

    const result = await createBookingAction(request());
    if (!result.ok) throw new Error("expected booking success");
    mocks.notify.mockRejectedValue(new Error(`failed for Sensitive Customer private@example.com +260977123456 ${result.accessToken}`));
    await expect(mocks.callbacks.at(-1)?.()).resolves.toBeUndefined();
    const lines = log.mock.calls.flat().join(" ");
    for (const value of ["Sensitive Customer", "private@example.com", "977123456", result.accessToken]) expect(lines).not.toContain(value);
    expect(lines).toContain("booking notification task failed");
  } finally {
    log.mockRestore();
  }
});
