import { eq } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { orders } from "./schema";
import { createTestDb } from "./test-db";

let database: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { database = await createTestDb(); });
afterAll(async () => { await database?.close(); });

let counter = 0;
function order(overrides: Partial<typeof orders.$inferInsert> = {}): typeof orders.$inferInsert {
  counter++;
  return {
    reference: `CAKE-2026-${String(counter).padStart(4, "0")}`, accessTokenHash: `hash-${counter}`,
    status: "awaiting_payment", paymentDueAt: new Date("2026-10-18T10:00:00Z"), fulfilment: "pickup",
    eventDate: "2026-10-25", timeWindow: "morning", customerName: "Mwila", customerPhone: "+260977123456",
    customerEmail: "mwila@example.com", deliveryAddress: "", designNotes: "", topperMessage: "",
    total: 1040, deposit: 520, createdAt: new Date("2026-10-17T10:00:00Z"), ...overrides,
  };
}

it("accepts a complete active order", async () => {
  await expect(database.db.insert(orders).values(order())).resolves.toBeDefined();
});

it.each<[string, Partial<typeof orders.$inferInsert>]>([
  ["missing phone", { customerPhone: null }],
  ["missing name", { customerName: null }],
  ["missing email", { customerEmail: null }],
  ["missing design notes", { designNotes: null }],
  ["unnormalised phone", { customerPhone: "0977123456" }],
  ["delivery without address", { fulfilment: "delivery", deliveryAddress: "  " }],
  ["unknown status", { status: "cancelled" as never }],
  ["unknown time window", { timeWindow: "night" as never }],
  ["awaiting payment without deadline", { paymentDueAt: null }],
  ["flag outside verification", { flaggedAt: new Date() }],
  ["deposit above total", { deposit: 2000 }],
  ["balance method without time", { status: "confirmed", balanceMethod: "cash" }],
])("rejects an active order with %s", async (_name, overrides) => {
  await expect(database.db.insert(orders).values(order(overrides))).rejects.toThrow();
});

it("allows null personal data once anonymised and keeps the business record", async () => {
  const [created] = await database.db.insert(orders).values(order({ fulfilment: "delivery", deliveryAddress: "Plot 1, Kabulonga" })).returning();
  await database.db.update(orders).set({
    anonymisedAt: new Date(), customerName: null, customerPhone: null, customerEmail: null,
    deliveryAddress: null, designNotes: null, topperMessage: null,
  }).where(eq(orders.id, created.id));
  const [row] = await database.db.select().from(orders).where(eq(orders.id, created.id));
  expect(row).toMatchObject({ reference: created.reference, eventDate: "2026-10-25", total: 1040, deposit: 520, customerPhone: null });
});
