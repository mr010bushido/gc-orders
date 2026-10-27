import { heartbeatStore } from "../platform/heartbeat";
import { registerHealthCheck } from "../platform/health";

export async function checkRetentionHeartbeat(now = new Date()) {
  if (process.env.NODE_ENV !== "production") return;
  const last = await heartbeatStore.last("retention");
  if (!last || now.getTime() - last.getTime() > 36 * 60 * 60_000) throw new Error("retention heartbeat is stale");
}

registerHealthCheck("jobs:retention", checkRetentionHeartbeat);
