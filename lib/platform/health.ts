type CheckResult = "ok" | "degraded" | "fail";
type HealthCheck = () => Promise<void | "degraded"> | void | "degraded";

const healthChecks = new Map<string, HealthCheck>();

/** A check passes by returning, reports `degraded` by returning that string, and fails by throwing or rejecting. */
export function registerHealthCheck(name: string, fn: HealthCheck) {
  healthChecks.set(name, fn);
}

export async function runHealthChecks() {
  const checks: Record<string, CheckResult> = Object.fromEntries(await Promise.all(
    [...healthChecks].map(async ([name, fn]) => {
      try {
        return [name, (await fn()) === "degraded" ? "degraded" : "ok"] as const;
      } catch {
        return [name, "fail"] as const;
      }
    }),
  ));
  const results = Object.values(checks);
  const status = results.includes("fail") ? "fail" as const : results.includes("degraded") ? "degraded" as const : "ok" as const;
  return { status, checks };
}
