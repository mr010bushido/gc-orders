## 1. Preconditions

- [x] 1.1 Read the shipped Next.js docs under `node_modules/next/dist/docs/` for route handlers, dynamic route `params` and `output: 'standalone'` before writing any route or config. Route handlers export HTTP method functions using Web `Request`/`Response`; dynamic `params` is a Promise and must be awaited (older versions passed it synchronously); `GET` handlers default to dynamic caching; standalone output creates `.next/standalone/server.js`, which uses `PORT` and `HOSTNAME` and does not copy public/static assets. Gate: findings recorded here.
- [x] 1.2 Confirm the baseline on the branch: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass before any edit. Gate: exit codes 0/0/0/0/0; 38 tests passed.

## 2. Interfaces and contract tests

- [x] 2.1 Add `lib/platform/owner-auth.ts` with the `Owner` type and the `OwnerAuth` interface (`sendMagicLink`, `completeLogin`, `getOwner`, `signOut`). Gate: `pnpm typecheck` exit 0.
- [x] 2.2 Add `lib/platform/image-store.ts` with the `ImageStore` interface (`put`, `createSignedUrl`, `delete`). Gate: `pnpm typecheck` exit 0.
- [x] 2.3 Add the exported contract suites `ownerAuthContract` and `imageStoreContract` and in-memory fakes for both, with a Vitest file that runs each suite against its fake. Cover every scenario in `specs/platform-portability/spec.md` for the two interfaces. Gate: `pnpm test lib/platform` exit 0, 7 tests passed.

## 3. Health endpoint

- [x] 3.1 Add `lib/platform/health.ts` with `registerHealthCheck(name, fn)` (same name replaces) and a `runHealthChecks()` that returns the `checks` map and the overall status. Gate: `pnpm test lib/platform/health.test.ts` exit 0, 4 tests passed (all pass, one fails, none, duplicate).
- [x] 3.2 Add `app/api/health/route.ts` returning 200 or 503 with `{ status, checks }`, `Cache-Control: no-store`, and no error text in the body. Gate: `pnpm test app/api/health/route.test.ts` exit 0, 3 tests passed (all pass, failure with connection string, none); cache header checked in each.

## 4. Scheduled jobs

- [x] 4.1 Add `lib/platform/heartbeat.ts` with the `HeartbeatStore` interface and an in-memory implementation, marked with a comment naming the database replacement. Gate: `pnpm test lib/platform/heartbeat.test.ts` exit 0, 2 tests passed (record, last after a run, never run).
- [x] 4.2 Add `lib/platform/jobs.ts` with a job registry (`defineJob(name, handler)`) and a constant-time `verifySecret` that hashes both values with SHA-256 and uses `timingSafeEqual`. Gate: `pnpm test lib/platform/jobs.test.ts` exit 0, 5 tests passed (correct, wrong, different length, empty supplied, unset/empty configured).
- [x] 4.3 Add `app/api/jobs/[name]/route.ts` implementing `specs/scheduled-jobs/spec.md`: 401 before any job lookup, 503 when `JOBS_SECRET` is unset or empty, 404 for an unknown job, 200 with the run summary on success, 500 with `ok: false` and no error text on a throwing handler, heartbeat recorded only on success. Gate: `pnpm test 'app/api/jobs/[name]/route.test.ts'` exit 0, 9 tests passed.
- [x] 4.4 Add `.env.example` listing `JOBS_SECRET=` with no value. Gate: `git show HEAD:.env.example` returned only `JOBS_SECRET=`; committed as `cbce6e2`.

## 5. Portability checker and standalone build

- [x] 5.1 Add `scripts/check-portability.mjs` exporting a pure `findViolations(files)` and a CLI entry that walks `app/`, `lib/`, `components/`, `scripts/`, any SQL or migration directories and `vercel.json`. Implement the rules in `specs/platform-portability/spec.md`, allowing `@supabase/*` and `auth.*` / `storage.*` text only under `lib/platform/adapters/supabase/`. Add the script `check:portability` to `package.json`. Gate: `pnpm check:portability` exit 0.
- [x] 5.2 Add a Vitest file for `findViolations` covering each forbidden pattern, the allowed adapter directory, and a clean tree. Gate: `pnpm test scripts/check-portability.test.ts` exit 0, 12 tests passed; `pnpm check:portability` exit 0.
- [x] 5.3 In `next.config.ts`, set `output: 'standalone'` only when `NEXT_OUTPUT=standalone`; the default config sets no `output`. Gate: `pnpm build` exit 0 with no standalone server, then `NEXT_OUTPUT=standalone pnpm build` exit 0 and `.next/standalone/server.js` exists.
- [x] 5.4 Add the CI changes to `.github/workflows/ci.yml`: run `pnpm check:portability` in the existing job, and add a `standalone-build` job that builds with `NEXT_OUTPUT=standalone`, starts `.next/standalone/server.js` on a free port, requires `curl -f` of `/api/health` to succeed, then stops the server. Gate: PyYAML parsed workflow; `pnpm check:portability` and `NEXT_OUTPUT=standalone pnpm build` exited 0; the workflow health script exited 0 with `{"status":"ok","checks":{}}` and stopped the server.

## 6. Documentation

- [x] 6.1 Update the "Portability guardrails" section in `CLAUDE.md` and `AGENTS.md` (identical in both) to name `lib/platform/`, the adapters directory, the contract suites and `pnpm check:portability`. Gate: `cmp` of portability sections exited 0; `cmp` of the `nextjs-agent-rules` block against `origin/develop` exited 0.

## 7. Verify

- [x] 7.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability`, the standalone build and health check from task 5.4, and `openspec validate platform-portability --strict`. Gate: all exit 0; 80 tests in 8 files passed; standalone `/api/health` returned `{"status":"ok","checks":{}}`.
- [x] 7.2 Commit on `feature/jms-165-platform-portability`. Do not push or open a PR; the coordinator does that with the user's authorization and updates JMS-165. Gate: `git status --short` clean and `git log -1` shows the JMS-165 implementation commit, verified after committing.
