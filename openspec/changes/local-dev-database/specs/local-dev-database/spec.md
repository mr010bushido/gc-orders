## ADDED Requirements

### Requirement: Dedicated local Postgres container
The repository SHALL define a local Postgres 17 service bound to `127.0.0.1` on port 5435 with a named volume and a healthcheck, and a disposable Postgres 17 service on port 5436 using tmpfs behind a compose profile. Neither SHALL publish port 5432, 5433 or 5434.

#### Scenario: Start the dev database
- **WHEN** a developer runs `pnpm db:up`
- **THEN** the dev Postgres container is running, healthy, and reachable on `127.0.0.1:5435`, and the test service is not started

#### Scenario: Stop keeps data
- **WHEN** a developer runs `pnpm db:down` and then `pnpm db:up`
- **THEN** previously inserted rows are still present

### Requirement: One-command local setup
`pnpm dev:setup` SHALL create `.env.local` when it does not exist (local `DATABASE_URL` and `DATABASE_MIGRATION_URL`, `APP_URL`, and a randomly generated `JOBS_SECRET`), start the dev database, wait until it is healthy, apply all migrations and seed the catalogue. It SHALL be safe to rerun and SHALL NOT overwrite an existing `.env.local` or any existing variable in it.

#### Scenario: Fresh checkout
- **WHEN** a developer with Docker runs `pnpm dev:setup` and then `pnpm dev`
- **THEN** `/api/health` reports the database `ok` and `/book` renders with the seeded catalogue

#### Scenario: Rerun
- **WHEN** `pnpm dev:setup` is run again after the owner edited a price
- **THEN** `.env.local` is unchanged, no migration is replayed, and the edited price is not overwritten

### Requirement: CLI scripts read the local env file
`pnpm db:migrate` and `pnpm db:seed` SHALL read `.env.local` when present without any shell export, and a variable already set in the shell SHALL take precedence over the file.

#### Scenario: No exports
- **WHEN** `.env.local` exists and `pnpm db:migrate` runs in a shell with no `DATABASE_URL`
- **THEN** it migrates the local database

#### Scenario: Shell wins
- **WHEN** `DATABASE_MIGRATION_URL` is exported and differs from `.env.local`
- **THEN** the exported value is used

### Requirement: Reset is local-only
`pnpm db:reset` SHALL delete the local dev volume, recreate the database, migrate and seed it, and SHALL refuse to run, changing nothing, when the configured database URL host is not `localhost`, `127.0.0.1` or `::1`.

#### Scenario: Local reset
- **WHEN** the URL points at `127.0.0.1:5435` and `pnpm db:reset` runs
- **THEN** the database is rebuilt empty, migrated and seeded

#### Scenario: Hosted URL
- **WHEN** `DATABASE_URL` points at a non-local host and `pnpm db:reset` runs
- **THEN** the command exits non-zero with an explanatory message and no container or volume is touched

### Requirement: No secrets committed
The committed files SHALL contain only the fixed local-development credentials; `JOBS_SECRET` and any provider credential SHALL NOT appear in committed files.

#### Scenario: Generated secret
- **WHEN** `.env.local` is created
- **THEN** `JOBS_SECRET` is random per developer and `.env.local` is git-ignored
