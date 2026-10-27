import "../../../lib/db/health";
import "../../../lib/jobs/expire-orders-health";
import "../../../lib/jobs/retention-health";
import "../../../lib/notify/health";
import { runHealthChecks } from "../../../lib/platform/health";

export async function GET() {
  const result = await runHealthChecks();
  return Response.json(result, {
    status: result.status === "fail" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
