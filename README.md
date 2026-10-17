<img src="assets/icon.svg" width="64" height="64" alt="">

# gc-orders

Online cake booking and order management for Giuseppe's Cakes.

- Scope: [`docs/PBS.md`](docs/PBS.md) (product breakdown structure + open questions)
- PRD: [`docs/PRD.md`](docs/PRD.md) · design system: [`design/DESIGN.md`](design/DESIGN.md) · flow prototype: [`docs/prototype/`](docs/prototype/cake-booking-prototype.html)

## Develop

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
openspec validate scaffold-nextjs-app --strict
```

Use Node.js 24 and the pnpm version pinned in `package.json`. The root Next.js App Router app uses TypeScript and Tailwind v4. `design/` remains the source of truth for tokens and branding. The landing page is a placeholder, not a booking flow. Builds and the default test suite need no database or environment variables. Database-backed runtime features require `DATABASE_URL`; `/api/health` returns a sanitized 503 when the database is unavailable or unconfigured.

`lib/pricing.ts` preserves the cake, add-on, delivery and deposit rules. Calendar dates and the 48-hour rush boundary use Africa/Lusaka, not the server timezone.

Normally branch from `develop` and open feature PRs with an explicit `develop` base. CI runs lint, typecheck, tests and the production build.

## Database development and migrations

Start the local Postgres 17 service and export the local-only connection URL:

```sh
docker compose up -d --wait
export DATABASE_URL='postgres://cakes:local-cakes-only@127.0.0.1:5432/cakes'
pnpm db:migrate
pnpm dev
```

The compose password is for local development only. Data lives in the `postgres-data` volume. `docker compose down` keeps it; adding `-v` deletes it. `.env.example` lists runtime and migration variables. Next.js can load `.env.local`, but the database CLI expects variables exported in the shell.

Runtime connections use `postgres` through Drizzle with prepared statements disabled for transaction poolers. `DATABASE_POOL_MAX` defaults to 1 per instance; set a positive integer to increase it on the VPS. `getDb()` is lazy and throws a variable-name-only error if `DATABASE_URL` is missing. Server code accepts the shared `Db` type rather than importing a driver.

For schema changes, edit `lib/db/schema.ts`, run `pnpm db:generate`, and commit the generated SQL, snapshots and journal under `drizzle/`. Review the SQL before applying it. A human runs `pnpm db:migrate` deliberately; builds and deployments never run migrations. Applied migrations are tracked in `drizzle.__drizzle_migrations`, so rerunning the command does not replay them. Do not edit an already-applied migration; generate a new one.

`db:migrate` uses `DATABASE_MIGRATION_URL` when set, otherwise `DATABASE_URL`. Use a direct connection or session pooler for migrations, not a transaction pooler. For Supabase on an IPv4-only host, use the session pooler rather than the IPv6-only direct connection. The runtime may use the transaction pooler. No cloud configuration or production migration is performed by these scripts automatically.

Schema conventions:

- Money columns are `integer` whole Kwacha. The pricing engine still calculates in integer hundredths internally.
- Instants use `timestamptz`; event calendar dates use `date`.
- Primary keys use `uuid default gen_random_uuid()`.
- Enumerated values use `text` with a check constraint, not Postgres enums.
- Every public table enables RLS with no policies. The owning application role connects directly; server code must still authorize every operation. Do not reference platform-owned authentication or storage schemas.

`job_heartbeats` stores each job's latest successful run. `HeartbeatStore` now uses the database, so a job whose heartbeat cannot be recorded returns failure. `RateLimiter.hit(key, limit, windowSeconds)` returns a boolean, stores SHA-256 key hashes, serializes competing hits for the same key, and removes expired hits as it runs. Use distinct key namespaces for different limit rules. No booking, lookup or login endpoints are added by this foundation.

`createTestDb()` in `lib/db/test-db.ts` creates a fresh PGlite database and applies the committed migrations without network access. Close each instance after use. Run hermetic schema and migration checks with:

```sh
pnpm test lib/db/schema.test.ts lib/db/migrations.test.ts
pnpm check:portability
```

CI's `migrate-postgres` job applies migrations twice to a disposable Postgres 17 service, then runs the same schema checks plus real-connection persistence and concurrency tests. To run those checks locally, use a dedicated disposable database, never production. The schema tests create and drop deliberately invalid test tables, and the integration test removes expired rate-limit hits.

```sh
DATABASE_MIGRATION_URL="$TEST_DATABASE_URL" pnpm db:migrate
DATABASE_MIGRATION_URL="$TEST_DATABASE_URL" pnpm db:migrate
pnpm test lib/db/schema.test.ts lib/db/postgres.test.ts
```

Export `TEST_DATABASE_URL` to that disposable database before running these commands. Without it, schema checks use PGlite and the Postgres-only integration test is skipped. The standalone-build CI job verifies that the built health route returns a sanitized 503 without database configuration.

Bootstrap exception: `feature/jms-162-scaffold-nextjs-app` is based on committed `docs/prd-design-system`, not `develop`, to include the first OpenSpec change and design sources before documentation PR #1 merges. PR #1 is not merged or retargeted by this work. The parent's uncommitted `verify-git-flow` change is excluded.
