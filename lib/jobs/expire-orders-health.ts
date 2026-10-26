import { heartbeatStore } from "../platform/heartbeat";
import { registerHealthCheck } from "../platform/health";

export async function checkExpireOrdersHeartbeat(now = new Date()) {
  if (process.env.NODE_ENV !== "production") return;
  const last = await heartbeatStore.last("expire-orders");
  if (!last || now.getTime() - last.getTime() > 45 * 60_000) throw new Error("expire-orders heartbeat is stale");
}

registerHealthCheck("jobs:expire-orders", checkExpireOrdersHeartbeat);
