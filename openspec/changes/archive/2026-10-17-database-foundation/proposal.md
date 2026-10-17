## Why

Nothing can be stored yet. Every remaining feature needs a database, and the app will move from Supabase to a self-hosted Postgres. The data layer therefore has to be plain Postgres through Drizzle, testable without cloud services, and free of Supabase-only schema.

## What Changes

- Add Drizzle ORM with the `postgres` driver, and a `lib/db` module that builds the client from `DATABASE_URL`.
- Add `drizzle-kit` scripts (`db:generate`, `db:migrate`) with migrations kept in `drizzle/`, and a baseline migration to prove the pipeline.
- Add `compose.yaml` for a local Postgres 17, and `DATABASE_URL` to `.env.example`.
- Run database tests in-process with PGlite so they need no Docker or network, and run the same migrations against a real Postgres 17 service in CI.
- Add a test that fails if any table lacks row-level security (enabled, no policies), as defense in depth.
- Register a `database` check in the health-check registry from `platform-portability`.
- Replace the in-memory `HeartbeatStore` from `platform-portability` with a database-backed one (`job_heartbeats`), as that change requires of the first change that adds a database.
- Add a Postgres-backed rate limiter (`rate_limit_hits`) behind a small interface, used by booking, lookup and login limits.
- Document the conventions: whole-Kwacha integers, `timestamptz`, uuid keys, no `auth.*` or `storage.*` references.

Out of scope: domain tables (each later change adds its own), seed data, backups.

## Capabilities

### New Capabilities
- `data-layer`: the database client, migration workflow, test strategy, schema conventions and health check.

### Modified Capabilities
None.

## Impact

- New: `lib/db/*`, `drizzle.config.ts`, `drizzle/`, `compose.yaml`, test helpers, CI job for migrations on Postgres 17.
- New dependencies: `drizzle-orm`, `postgres`; dev: `drizzle-kit`, `@electric-sql/pglite`.
- Modified: `.env.example`, `package.json`, `.github/workflows/ci.yml`.
- Owner: Codex. Depends on `platform-portability` (JMS-165) for the health registry and `lib/platform` conventions.
- Linear issue: created when the implementer is delegated.
