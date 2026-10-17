# data-layer Specification

## Purpose
TBD - created by archiving change database-foundation. Update Purpose after archive.
## Requirements
### Requirement: Database access through Drizzle on plain Postgres
The system SHALL access the database only through Drizzle ORM in server code, using a client built from `DATABASE_URL`. Schema and migrations SHALL be valid on plain Postgres 17 and SHALL NOT reference `auth.*`, `storage.*` or `auth.uid()`.

#### Scenario: Missing connection string
- **WHEN** the client is requested and `DATABASE_URL` is not set
- **THEN** it throws an error naming the missing variable and never prints its value

#### Scenario: Platform schema reference
- **WHEN** a migration file contains `auth.uid()` or a reference to the `auth` or `storage` schema
- **THEN** the schema check test fails

### Requirement: Migrations are versioned and applied deliberately
Migrations SHALL be generated SQL files committed in `drizzle/`. `pnpm db:migrate` SHALL apply them using `DATABASE_MIGRATION_URL`, falling back to `DATABASE_URL`. Building or deploying the app SHALL NOT run migrations.

#### Scenario: Fresh database
- **WHEN** `pnpm db:migrate` runs on an empty Postgres 17 database
- **THEN** all migrations apply in order and a second run changes nothing

#### Scenario: Build does not migrate
- **WHEN** `pnpm build` runs
- **THEN** no connection to the database is made

### Requirement: Hermetic database tests
Database tests SHALL run in-process against PGlite using the committed migrations, without Docker or network access. CI SHALL also apply the same migrations to a Postgres 17 service and run the schema checks there.

#### Scenario: Offline test run
- **WHEN** `pnpm test` runs with no database configured and no network
- **THEN** database tests run against PGlite and pass

#### Scenario: Real Postgres check
- **WHEN** CI runs the `migrate-postgres` job
- **THEN** migrations apply to Postgres 17 and the schema checks pass

### Requirement: Row-level security on every table
Every table in the `public` schema SHALL have row-level security enabled with no permissive policies, so no role other than the owning application role can read or write it. Application code SHALL NOT rely on RLS for authorization.

#### Scenario: New table without RLS
- **WHEN** a migration adds a table that does not enable RLS
- **THEN** the schema check test fails and names the table

### Requirement: Schema conventions
Money columns SHALL be `integer` whole Kwacha. Instants SHALL be `timestamptz` and calendar dates SHALL be `date`. Primary keys SHALL be `uuid` with a database default. Enumerated values SHALL be `text` with a check constraint.

#### Scenario: Convention check
- **WHEN** the schema check test inspects every table
- **THEN** it fails on a `timestamp without time zone` column, a Postgres enum type, or a `serial` primary key

### Requirement: Database health check
The system SHALL register a check named `database` in the health registry that runs a trivial query with a 2-second timeout and reports only ok or failed, without connection details.

#### Scenario: Database down
- **WHEN** the query fails or times out
- **THEN** `GET /api/health` reports the `database` check as failed and the body contains no connection string or error text from the driver

### Requirement: Database heartbeat store
The system SHALL provide a `HeartbeatStore` implementation backed by a `job_heartbeats` table, replacing the in-memory one. `record(job, at)` SHALL upsert the job's latest time and `last(job)` SHALL return it, or null if none exists.

#### Scenario: Survives restart
- **WHEN** a heartbeat is recorded and the process restarts
- **THEN** `last(job)` still returns that time

#### Scenario: Never run
- **WHEN** no heartbeat exists for a job
- **THEN** `last(job)` returns null

### Requirement: Rate limiter
The system SHALL provide a `RateLimiter` interface with `hit(key, limit, windowSeconds)` returning whether the call is allowed, and a Postgres-backed implementation using a `rate_limit_hits` table. Keys SHALL be stored hashed so that addresses and phone numbers are not kept in plain text. Expired hits SHALL be removed by the limiter itself as it runs.

#### Scenario: Limit reached
- **WHEN** `hit("login:ip", 5, 3600)` is called 6 times in an hour
- **THEN** the sixth returns not allowed

#### Scenario: Window passes
- **WHEN** the window has elapsed since the first hit
- **THEN** a new hit is allowed

#### Scenario: Key not readable
- **WHEN** a hit is recorded for a phone number
- **THEN** the table contains only a hash of the key

### Requirement: Local development database
The repository SHALL include a `compose.yaml` that starts Postgres 17 for local development, and `.env.example` SHALL document `DATABASE_URL` and `DATABASE_MIGRATION_URL` without real values.

#### Scenario: Local start
- **WHEN** a developer runs `docker compose up -d` and `pnpm db:migrate`
- **THEN** the migrations apply to the local database

