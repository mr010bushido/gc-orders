import { afterEach, beforeEach, expect, it, vi } from "vitest";

const original = process.env.JOBS_SECRET;
beforeEach(() => {
  vi.resetModules();
  process.env.JOBS_SECRET = "correct-secret";
});
afterEach(() => { process.env.JOBS_SECRET = original; });

function request(secret?: string) {
  return new Request("http://localhost/api/jobs/expire", {
    method: "POST",
    headers: secret === undefined ? {} : { authorization: `Bearer ${secret}` },
  });
}

it("runs a known job and records a heartbeat", async () => {
  const { defineJob } = await import("../../../../lib/platform/jobs");
  const { heartbeatStore } = await import("../../../../lib/platform/heartbeat");
  const { POST } = await import("./route");
  const handler = vi.fn();
  defineJob("expire", handler);
  const response = await POST(request("correct-secret"), { params: Promise.resolve({ name: "expire" }) });
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ job: "expire", ok: true });
  expect(new Date(body.finishedAt).getTime()).toBeGreaterThanOrEqual(new Date(body.startedAt).getTime());
  expect((await heartbeatStore.last("expire"))?.getTime()).toBeGreaterThanOrEqual(new Date(body.startedAt).getTime());
  expect(handler).toHaveBeenCalledOnce();
});

it.each([undefined, "wrong", "short", ""])("rejects a missing or wrong bearer secret (%s) before job lookup", async (secret) => {
  const { defineJob } = await import("../../../../lib/platform/jobs");
  const { POST } = await import("./route");
  const handler = vi.fn();
  defineJob("expire", handler);
  const known = await POST(request(secret), { params: Promise.resolve({ name: "expire" }) });
  const unknown = await POST(request(secret), { params: Promise.resolve({ name: "unknown" }) });
  expect(known.status).toBe(401);
  expect(await known.text()).toBe(await unknown.text());
  expect(handler).not.toHaveBeenCalled();
});

it("returns 404 for a known secret and unknown job", async () => {
  const { POST } = await import("./route");
  expect((await POST(request("correct-secret"), { params: Promise.resolve({ name: "unknown" }) })).status).toBe(404);
});

it.each([undefined, ""])("fails closed with an unset or empty configured secret (%s)", async (secret) => {
  if (secret === undefined) delete process.env.JOBS_SECRET;
  else process.env.JOBS_SECRET = secret;
  const { defineJob } = await import("../../../../lib/platform/jobs");
  const { POST } = await import("./route");
  const handler = vi.fn();
  defineJob("expire", handler);
  expect((await POST(request(""), { params: Promise.resolve({ name: "expire" }) })).status).toBe(503);
  expect(handler).not.toHaveBeenCalled();
});

it("hides a handler error and leaves its heartbeat unchanged", async () => {
  const { defineJob } = await import("../../../../lib/platform/jobs");
  const { heartbeatStore } = await import("../../../../lib/platform/heartbeat");
  const { POST } = await import("./route");
  defineJob("expire", () => { throw new Error("secret-value"); });
  const response = await POST(request("correct-secret"), { params: Promise.resolve({ name: "expire" }) });
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ job: "expire", ok: false });
  expect(await heartbeatStore.last("expire")).toBeNull();
});
