import "../../../../lib/jobs/expire-orders";
import { heartbeatStore } from "../../../../lib/platform/heartbeat";
import { getJob, verifySecret } from "../../../../lib/platform/jobs";

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!process.env.JOBS_SECRET) return Response.json({ ok: false }, { status: 503 });

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ") || !verifySecret(authorization.slice(7))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { name } = await params;
  const handler = getJob(name);
  if (!handler) return Response.json({ ok: false }, { status: 404 });

  const startedAt = new Date();
  try {
    await handler();
    const finishedAt = new Date();
    await heartbeatStore.record(name, finishedAt);
    return Response.json({ job: name, ok: true, startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString() });
  } catch {
    return Response.json({ job: name, ok: false }, { status: 500 });
  }
}
