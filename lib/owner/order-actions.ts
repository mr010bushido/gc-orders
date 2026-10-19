import type { Db } from "../db";
import { getOrder, type Order } from "../orders/orders";
import { clearFlag as clearOrderFlag, complete, markBalancePaid, markSeen, setFlag, transition } from "../orders/transitions";
import type { BalanceMethod } from "../db/schema/orders";
import type { NotifyOrder } from "../notify/notify";

export type ActionResult = { ok: true; order: Omit<Order, "accessTokenHash">; balanceUnpaid?: boolean } | { ok: false; code: string; message: string };
export type OwnerOrderDeps = { db: Db; now?: () => Date; notifyVerified?: (order: NotifyOrder) => void | Promise<void> };
const safeOrder = (source: Order) => {
  const order = { ...source } as Partial<Order>;
  delete order.accessTokenHash;
  return order as Omit<Order, "accessTokenHash">;
};
const failure = (code: string, message: string): ActionResult => ({ ok: false, code, message });

async function run(deps: OwnerOrderDeps, fn: (now: Date) => Promise<Order | { order: Order; balanceUnpaid: boolean }>): Promise<ActionResult> {
  try {
    const result = await fn((deps.now ?? (() => new Date()))());
    if ("order" in result) return { ok: true, order: safeOrder(result.order), balanceUnpaid: result.balanceUnpaid };
    return { ok: true, order: safeOrder(result) };
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "ACTION_FAILED";
    const message = code === "INVALID_TRANSITION" ? "This order changed. Refresh and try again." : code === "ORDER_NOT_FOUND" ? "Order not found." : code === "ORDER_INVALID" ? "Check the entered details." : "The order could not be updated.";
    return failure(code, message);
  }
}

export async function verifyOrderForOwner(deps: OwnerOrderDeps, id: string): Promise<ActionResult> {
  const result = await run(deps, now => transition(deps.db, id, "verify", "owner", now));
  if (result.ok && deps.notifyVerified) {
    const detail = await getOrder(deps.db, id);
    if (detail) void Promise.resolve(deps.notifyVerified({ ...detail.order, id: detail.order.id, customerPhone: detail.order.customerPhone, customerEmail: detail.order.customerEmail })).catch(() => undefined);
  }
  return result;
}

export const flagOrderForOwner = (deps: OwnerOrderDeps, id: string, note: string) => run(deps, now => setFlag(deps.db, id, note, now));
export const clearFlagForOwner = (deps: OwnerOrderDeps, id: string) => run(deps, now => clearOrderFlag(deps.db, id, now));
export const completeOrderForOwner = (deps: OwnerOrderDeps, id: string) => run(deps, now => complete(deps.db, id, now));
export const recordBalancePaidForOwner = (deps: OwnerOrderDeps, id: string, payment: { method: BalanceMethod; note?: string }) => run(deps, now => markBalancePaid(deps.db, id, payment, now));
export const markOrderSeenForOwner = (deps: OwnerOrderDeps, id: string) => run(deps, now => markSeen(deps.db, id, now));
