const healthChecks = new Map<string, () => Promise<void> | void>();

export function registerHealthCheck(name: string, fn: () => Promise<void> | void) {
  healthChecks.set(name, fn);
}

export async function runHealthChecks() {
  const checks = Object.fromEntries(await Promise.all(
    [...healthChecks].map(async ([name, fn]) => {
      try {
        await fn();
        return [name, "ok"] as const;
      } catch {
        return [name, "fail"] as const;
      }
    }),
  ));
  return { status: Object.values(checks).includes("fail") ? "fail" as const : "ok" as const, checks };
}
