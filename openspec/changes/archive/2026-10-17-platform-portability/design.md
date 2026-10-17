## Context

- `origin/develop` has the Next.js 16 scaffold: `app/`, `components/`, `lib/pricing.ts`, Vitest, and CI running lint, typecheck, test and build. There is no database, auth, storage, API route or environment variable yet.
- Decided: Supabase (Postgres, Storage, Auth, `pg_cron`) with Drizzle (Q25); owner login by Supabase Auth magic link, one allowed email (Q26, Q34); `pg_cron` calls a secret-protected app endpoint every 15 minutes (Q29/Q35); up to 3 images per order in storage (Q39).
- Decided later: pilot on Vercel and Supabase, then move to a self-hosted VPS (Docker Compose, Caddy, systemd timers).
- This Next.js version differs from older ones (`AGENTS.md` says to read `node_modules/next/dist/docs/` first), so route handler and `params` conventions must be checked in those docs before coding.
- The guardrail text from `agent-workflow` is in both docs and has no enforcement.

## Goals / Non-Goals

**Goals:**
- Make the guardrails fail CI instead of relying on agents reading them.
- Fix the shape of the three interfaces now, so the later Supabase adapters and VPS adapters implement one contract.
- Prove the app can run as a standalone Node server, which is what a VPS needs.
- Give every environment a health check and a heartbeat the later sentinel can read.

**Non-Goals:**
- Any real adapter, database, Drizzle setup or schema.
- A Dockerfile or any VPS provisioning.
- Rate limiting, the access registry and the other `security-baseline` checks.
- The expiry job itself. This change only defines the contract it will use.

## Decisions

1. **Interfaces live in `lib/platform/`, adapters in `lib/platform/adapters/<name>/`.** Only that directory may import `@supabase/*`. Everything else imports the interface. *Rejected:* one flat file per vendor, which makes the forbidden-import rule hard to state.
2. **`OwnerAuth` is four methods: `sendMagicLink(email, redirectTo)`, `completeLogin(params)`, `getOwner(headers)` and `signOut(headers)`.** `Owner` is `{ id, email }`. The single-owner allowlist (Q34) is enforced by our own code around the adapter, not inside it, so a VPS adapter cannot forget it. *Rejected:* exposing a session object, which would leak Supabase's shape.
3. **`ImageStore` is `put(key, bytes, contentType)`, `createSignedUrl(key, ttlSeconds)` and `delete(key)`.** The size, count and MIME rules (Q39) are enforced before calling it. A VPS implementation is an S3-compatible bucket or a local volume. *Rejected:* returning public URLs, because the images are private.
4. **Contract tests are exported suites, not documentation.** `ownerAuthContract(factory)` and `imageStoreContract(factory)` run against any implementation; this change proves them with small in-memory fakes. Each future adapter must pass the same suite.
5. **The scheduler contract is an HTTP endpoint, not a platform feature.** `POST /api/jobs/<name>` with `Authorization: Bearer <JOBS_SECRET>`. The caller authenticates before the app reveals whether a job exists (an unauthenticated request gets 401 for every name). If `JOBS_SECRET` is unset the route returns 503 and never accepts an empty bearer. Comparison hashes both sides with SHA-256 and uses `timingSafeEqual`. Handlers must be idempotent; the route does not lock. *Rejected:* Vercel Cron, which would tie scheduling to the pilot host.
6. **A heartbeat is recorded only after a successful run.** `HeartbeatStore` has `record(job, at)` and `last(job)`. The default implementation is in memory and says so in a comment, because the data layer does not exist yet; the database implementation replaces it later. The sentinel will alert when a heartbeat is stale, which also catches a scheduler that never fires.
7. **`GET /api/health` runs registered checks and returns 200 or 503.** Body: `{ status, checks: { <name>: "ok" | "fail" } }`, never error text, versions or environment values, and `Cache-Control: no-store`. With no checks registered it returns 200. *Rejected:* a database ping now, since there is no database.
8. **The standalone build is opt-in through an environment variable.** `next.config.ts` sets `output: 'standalone'` only when `NEXT_OUTPUT=standalone`. The default build is unchanged for Vercel. A separate CI job builds with the variable set, starts `.next/standalone/server.js` and requires `/api/health` to answer 200. *Rejected:* always standalone, which changes the pilot's deployment for no benefit; and a Dockerfile, which belongs to `vps-platform`.
9. **The checker is a dependency-free Node script.** `scripts/check-portability.mjs` walks the repository and exports a pure `findViolations` function that Vitest tests. Rules: no `@vercel/kv`, `@vercel/blob`, `@vercel/edge-config` or `@vercel/postgres` imports; no `crons` key in `vercel.json`; no `@supabase/*` imports outside `lib/platform/adapters/supabase/`; no `auth.uid()`, `auth.jwt()`, `auth.users` or `storage.objects` text in SQL, migrations or source outside that directory. *Rejected:* an ESLint rule, because it cannot see SQL files or JSON.
10. **`.env.example` lists variable names only.** `JOBS_SECRET=` with no value. Different values per environment are a `security-baseline` check.

## Risks / Trade-offs

- [The interface shapes are guesses made before any real adapter] → They are small and kept behind one directory. Changing them while there are no adapters costs nothing, and the contract tests make a later change visible.
- [The in-memory heartbeat is lost on restart and on serverless] → It is a stand-in with a comment naming the replacement, and the database implementation is a task of the first change that adds the data layer.
- [Textual checks have false positives or miss obfuscated imports] → The checker is a backstop for convenient mistakes, not a security boundary, and the rules are listed in the spec so they can be tightened.
- [The standalone proof does not exercise the whole app] → It proves the build and server start only; `vps-platform` adds the real container test.
- [Next.js 16 conventions differ from training data] → The tasks require reading the shipped docs before writing the routes.

## Migration Plan

Additive. Merge the PR; CI gains two checks. Rollback is reverting the PR; nothing else depends on the new files yet. The first backend change that adds a database must register a health check and replace the in-memory heartbeat store.

## Open Questions

- None blocking. Whether `OwnerAuth` should expose a refresh step is left until the Supabase adapter exists, when it can be added without breaking the contract.
