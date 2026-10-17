## Why

The app is piloted on Vercel and Supabase, then moves to a self-hosted VPS. The portability guardrails in `CLAUDE.md` and `AGENTS.md` are documentation only: the first convenient `supabase-js` call, `auth.uid()` policy or Vercel Cron entry would quietly undo them. This has to land before the first backend change, while there is almost nothing to untangle.

## What Changes

- New `platform-portability` spec for the guardrails, made checkable: plain Postgres through Drizzle with migrations in the repo, authorization in server code, and no Vercel-only runtime features.
- Define the three interfaces we own, under `lib/platform/`, with reusable contract tests so any adapter, Supabase now and a VPS one later, must pass the same suite:
  - `OwnerAuth`: send a magic link, complete a login, read the current owner, sign out.
  - `ImageStore`: put, signed URL, delete.
  - The scheduler contract (below).
- New `scheduled-jobs` spec and endpoint: `POST /api/jobs/<name>` behind a bearer secret, fail closed, idempotent handlers, and a heartbeat recorded after each successful run. The caller (`pg_cron` today, a systemd timer on the VPS) is not the app's concern.
- New `health-endpoint` spec and route: `GET /api/health` returns a status and a registry of named checks, with no secrets in the body. The database check is added when the data layer lands.
- A checker, `pnpm check:portability`, run in CI, that fails on forbidden platform imports, `vercel.json` cron entries, and `auth.*` / `storage.*` references outside the adapter directory.
- A CI job that proves `next build` works with `output: 'standalone'` and that the standalone server answers `/api/health`. The default build stays unchanged for Vercel.
- Update the shared "Portability guardrails" section in `CLAUDE.md` and `AGENTS.md` (kept word for word identical) to name the interfaces, directory and checker.

Out of scope: the Supabase schema, Drizzle setup, real auth and storage adapters, a Dockerfile, and the VPS itself (`plan-vps-migration`, `vps-platform`).

## Capabilities

### New Capabilities
- `platform-portability`: the portability rules, the `OwnerAuth` and `ImageStore` interfaces with contract tests, the forbidden-pattern checker, and the standalone-build CI proof.
- `scheduled-jobs`: the `POST /api/jobs/<name>` contract, its authentication, heartbeat and failure behavior.
- `health-endpoint`: `GET /api/health` and the health-check registry.

### Modified Capabilities
None.

## Impact

- New: `lib/platform/*`, `app/api/health/route.ts`, `app/api/jobs/[name]/route.ts`, `scripts/check-portability.mjs`, Vitest tests, `.env.example`, a CI job.
- Modified: `package.json` (a script, no new dependencies), `next.config.ts` (an opt-in `output`), `.github/workflows/ci.yml`, `CLAUDE.md`, `AGENTS.md`.
- Adds one environment variable, `JOBS_SECRET`, with a different value per environment. No value is committed.
- Tracked as Linear issue JMS-165 on `feature/jms-165-platform-portability`. Backend work, so Codex owns it under the roster rules.
- Must merge before the first backend change. Independent of `linear-status-sync` (JMS-164), which edits different sections of the same two docs.
