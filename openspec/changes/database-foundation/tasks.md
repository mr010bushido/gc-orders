## 1. Dependencies and client

- [x] 1.1 Add `drizzle-orm`, `postgres`, `drizzle-kit` and `@electric-sql/pglite`; allow esbuild's required install scripts. Gate: `CI=true pnpm install --frozen-lockfile --force --store-dir <empty temporary store>` passed, 448 downloaded, 0 reused.
- [x] 1.2 `lib/db/index.ts`: lazy `getDb()` from `DATABASE_URL` (`prepare: false`, pool size from `DATABASE_POOL_MAX`, default 1), shared `Db` type, clear missing-variable error. Gate: `pnpm test lib/db/index.test.ts` 9 passed; `pnpm typecheck` passed.
- [x] 1.3 `drizzle.config.ts`, scripts `db:generate` and `db:migrate` (uses `DATABASE_MIGRATION_URL`, then `DATABASE_URL`), baseline migration, `compose.yaml`, `.env.example` entries. Gate: `pnpm db:generate`, `docker compose config --quiet`, `pnpm typecheck`, `pnpm lint` passed; baseline applied twice on local Postgres 17 using each URL variable.

## 2. Tests

- [x] 2.1 `lib/db/test-db.ts`: create a fresh PGlite database with committed migrations applied, for later changes. Gate: `pnpm test lib/db/test-db.test.ts` 1 passed; `pnpm typecheck` passed; isolated databases and shared `Db` assignment checked.
- [ ] 2.2 Schema check tests: RLS enabled on every `public` table, no `auth.`/`storage.` references in migrations, column conventions (no `timestamp` without time zone, no enum types, no `serial`)
- [ ] 2.3 Migration idempotency test: applying twice changes nothing

## 3. Health and CI

- [ ] 3.1 Register the `database` health check (2 s timeout, no driver text in the response) with tests for success, failure and timeout
- [ ] 3.2 `job_heartbeats` table and database `HeartbeatStore` passing the heartbeat scenarios; swap it in for the in-memory store
- [ ] 3.3 `rate_limit_hits` table and Postgres `RateLimiter` (hashed keys, self-cleaning) with window and limit tests
- [ ] 3.4 CI job `migrate-postgres`: Postgres 17 service, apply migrations, run the schema checks against it
- [ ] 3.5 Document migration steps (pooler vs direct URL, human-run migrations) in `README.md`

## 4. Verify

- [ ] 4.1 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass with no database configured; `openspec validate database-foundation --strict` passes
