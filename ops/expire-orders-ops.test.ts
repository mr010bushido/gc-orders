import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const files = ["ops/pg_cron/expire-orders.sql", "ops/systemd/expire-orders.service", "ops/systemd/expire-orders.timer", "ops/systemd/README.md"];

it("documents only a placeholder or environment variable for the job secret", () => {
  const content = files.map(file => readFileSync(file, "utf8")).join("\n");
  const service = readFileSync("ops/systemd/expire-orders.service", "utf8");
  expect(content).toContain("REPLACE_WITH_JOBS_SECRET");
  expect(content).toContain("${JOBS_SECRET}");
  expect(service).toContain('"${APP_URL}/api/jobs/expire-orders" --header "Authorization: Bearer ${JOBS_SECRET}"');
  expect(content.match(/Bearer\s+([^\s'"`]+)/g)).toEqual([
    "Bearer REPLACE_WITH_JOBS_SECRET", "Bearer ${JOBS_SECRET}", "Bearer ${JOBS_SECRET}",
  ]);
});
