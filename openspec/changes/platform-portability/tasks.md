## 1. Preconditions

- [ ] 1.1 Read the shipped Next.js docs under `node_modules/next/dist/docs/` for route handlers, dynamic route `params` and `output: 'standalone'` before writing any route or config. Record the conventions that differ from older Next.js on this line. Gate: the findings are written here.
- [ ] 1.2 Confirm the baseline on the branch: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass before any edit. Gate: five exit codes recorded.

## 2. Interfaces and contract tests

- [ ] 2.1 Add `lib/platform/owner-auth.ts` with the `Owner` type and the `OwnerAuth` interface (`sendMagicLink`, `completeLogin`, `getOwner`, `signOut`). Gate: `pnpm typecheck` passes.
- [ ] 2.2 Add `lib/platform/image-store.ts` with the `ImageStore` interface (`put`, `createSignedUrl`, `delete`). Gate: `pnpm typecheck` passes.
- [ ] 2.3 Add the exported contract suites `ownerAuthContract` and `imageStoreContract` and in-memory fakes for both, with a Vitest file that runs each suite against its fake. Cover every scenario in `specs/platform-portability/spec.md` for the two interfaces. Gate: `pnpm test lib/platform` passes with the scenario count recorded.

## 3. Health endpoint

- [ ] 3.1 Add `lib/platform/health.ts` with `registerHealthCheck(name, fn)` (same name replaces) and a `runHealthChecks()` that returns the `checks` map and the overall status. Gate: unit tests for all pass, one fails, none registered, and duplicate names.
- [ ] 3.2 Add `app/api/health/route.ts` returning 200 or 503 with `{ status, checks }`, `Cache-Control: no-store`, and no error text in the body. Gate: route tests for each scenario in `specs/health-endpoint/spec.md`, including a failing check whose message contains a connection string that must not appear in the response.

## 4. Scheduled jobs

- [ ] 4.1 Add `lib/platform/heartbeat.ts` with the `HeartbeatStore` interface and an in-memory implementation, marked with a comment naming the database replacement. Gate: tests for `record`, `last` after a run, and `last` for a job that never ran.
- [ ] 4.2 Add `lib/platform/jobs.ts` with a job registry (`defineJob(name, handler)`) and a constant-time `verifySecret` that hashes both values with SHA-256 and uses `timingSafeEqual`. Gate: tests for correct secret, wrong secret, different length, empty supplied value, and unset `JOBS_SECRET`.
- [ ] 4.3 Add `app/api/jobs/[name]/route.ts` implementing `specs/scheduled-jobs/spec.md`: 401 before any job lookup, 503 when `JOBS_SECRET` is unset or empty, 404 for an unknown job, 200 with the run summary on success, 500 with `ok: false` and no error text on a throwing handler, heartbeat recorded only on success. Gate: route tests for every scenario in the spec.
- [ ] 4.4 Add `.env.example` listing `JOBS_SECRET=` with no value. Gate: the file has no secret value and is committed.

## 5. Portability checker and standalone build

- [ ] 5.1 Add `scripts/check-portability.mjs` exporting a pure `findViolations(files)` and a CLI entry that walks `app/`, `lib/`, `components/`, `scripts/`, any SQL or migration directories and `vercel.json`. Implement the rules in `specs/platform-portability/spec.md`, allowing `@supabase/*` and `auth.*` / `storage.*` text only under `lib/platform/adapters/supabase/`. Add the script `check:portability` to `package.json`. Gate: `pnpm check:portability` exits 0 on the repository.
- [ ] 5.2 Add a Vitest file for `findViolations` covering each forbidden pattern, the allowed adapter directory, and a clean tree. Gate: tests pass and each forbidden rule has a failing-input case.
- [ ] 5.3 In `next.config.ts`, set `output: 'standalone'` only when `NEXT_OUTPUT=standalone`; the default config sets no `output`. Gate: `pnpm build` output is unchanged without the variable, and `NEXT_OUTPUT=standalone pnpm build` produces `.next/standalone/server.js`.
- [ ] 5.4 Add the CI changes to `.github/workflows/ci.yml`: run `pnpm check:portability` in the existing job, and add a `standalone-build` job that builds with `NEXT_OUTPUT=standalone`, starts `.next/standalone/server.js` on a free port, requires `curl -f` of `/api/health` to succeed, then stops the server. Gate: the workflow is valid YAML, and both new steps pass locally with the same commands.

## 6. Documentation

- [ ] 6.1 Update the "Portability guardrails" section in `CLAUDE.md` and `AGENTS.md` (identical in both) to name `lib/platform/`, the adapters directory, the contract suites and `pnpm check:portability`. Gate: `cmp` of the shared sections is identical and the `nextjs-agent-rules` block in `AGENTS.md` is byte-identical to `origin/develop`.

## 7. Verify

- [ ] 7.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability`, the standalone build and health check from task 5.4, and `openspec validate platform-portability --strict`. Gate: all pass, with test counts recorded.
- [ ] 7.2 Commit on `feature/jms-165-platform-portability`. Do not push or open a PR; the coordinator does that with the user's authorization and updates JMS-165. Gate: `git status` is clean and `git log -1` shows the commit.
