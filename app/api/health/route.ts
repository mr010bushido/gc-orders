import { runHealthChecks } from "../../../lib/platform/health";

export async function GET() {
  const result = await runHealthChecks();
  return Response.json(result, {
    status: result.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
