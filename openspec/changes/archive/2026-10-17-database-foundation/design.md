## Context

The pilot runs on Vercel with Supabase Postgres; the later host is a self-hosted VPS. Serverless functions open many short-lived connections, so Supabase's pooled connection string is used at runtime. Migrations need a direct or session connection. Agents cannot touch Supabase or run production migrations, so tests must run anywhere.

## Goals / Non-Goals

**Goals:**
- One schema, one migration history, valid on Supabase and on plain Postgres 17.
- Fast, hermetic database tests that run inside an agent sandbox.

**Non-Goals:**
- Choosing the pooler setup in Supabase, running migrations in production, or any domain table.

## Decisions

- **`postgres` (postgres.js) with Drizzle.** Works on Vercel and on a VPS and supports the pooler. `prepare: false` is set because Supabase's transaction pooler does not support prepared statements. The pool size defaults to 1 per instance and can be raised with `DATABASE_POOL_MAX` on the VPS.
- **PGlite for tests, real Postgres for the migration check.** PGlite is real Postgres compiled to WASM, so SQL, constraints, row locks and RLS behave the same, with no Docker. The CI job `migrate-postgres` applies the migrations to a Postgres 17 service container and runs the schema checks there, which catches any PGlite-only behaviour. Alternative considered: a local Postgres for all tests; rejected because agent sandboxes may have no Docker.
- **One `Db` type.** Functions accept a Drizzle `PgDatabase` type shared by both drivers, so domain code never imports a driver.
- **Migrations are generated SQL files, committed.** Applied with `pnpm db:migrate` against `DATABASE_MIGRATION_URL` (direct or session pooler) falling back to `DATABASE_URL`. Vercel builds never run migrations. A human runs them, so a bad migration cannot ship by deploy alone.
- **RLS on, no policies.** Every table has RLS enabled so the Supabase anon and authenticated roles can read nothing through the Data API even if it is ever switched on. The app connects as the table owner and enforces authorization in server code. The test reads `pg_class.relrowsecurity` for every table in `public`.
- **Conventions.** Money is `integer` whole Kwacha. Instants are `timestamptz`; event dates are `date`. Primary keys are `uuid default gen_random_uuid()`. Enumerations are `text` with a `check` constraint, not Postgres enum types, so adding a value is a simple migration.

## Risks / Trade-offs

- [Supabase free tier direct connections are IPv6 only] → Run migrations through the session pooler URL, which is IPv4; documented in `.env.example`.
- [PGlite differs from Postgres in an edge case] → The Postgres 17 CI job runs the same migrations and schema checks.
- [A pooled URL used for migrations can fail on advisory locks] → Separate `DATABASE_MIGRATION_URL`.
- [The baseline migration is empty of tables] → It exists to prove the pipeline; the first domain tables arrive with `catalogue-pricing-config`.

## Migration Plan

Merge, then a human adds `DATABASE_URL` to Vercel (Preview and Production separately) and runs `pnpm db:migrate`. Rollback is reverting the PR; no data exists yet.
