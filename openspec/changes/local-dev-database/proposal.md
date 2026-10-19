## Why

Running `pnpm dev` on a fresh checkout fails: `/book` returns 500 (`DATABASE_URL is required`) and `/api/health` reports the database as failed. The repo ships a `compose.yaml`, but it publishes Postgres on 5432 (already taken by a host Postgres on the owner's machine), and nothing wires up `DATABASE_URL`, migrations or the catalogue seed, so every developer has to export variables by hand in the right order. `fpp_board_backend` solved this with a dedicated dev Postgres container on its own port and fixed local credentials. This change gives gc-orders the same: one command to get a working local database.

## What Changes

- `compose.yaml`: a named dev Postgres 17 container on its own loopback port (5435) with a named volume and healthcheck, and a disposable test Postgres (5436, tmpfs) behind a `test` profile for `TEST_DATABASE_URL`. Ports avoid 5432 and the 5433/5434 used by `fpp_board_backend`.
- `pnpm dev:setup`: creates `.env.local` when missing (local `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `APP_URL`, a random `JOBS_SECRET`), starts the container, waits until healthy, migrates and seeds. Safe to rerun; never overwrites an existing `.env.local`.
- `pnpm db:up`, `db:down`, `db:reset`: start, stop (data kept), and wipe-and-rebuild the local database. `db:reset` refuses any non-local database URL.
- `db:migrate` and `db:seed` read `.env.local` automatically, so no shell exports are needed.
- README quickstart and `.env.example` updated.

Out of scope: running the Next.js app itself in Docker, CI changes (CI keeps its own Postgres service container), Supabase or production configuration, any application code.

## Capabilities

### New Capabilities
- `local-dev-database`: the local Postgres container, the setup/reset commands and their safety rules.

### Modified Capabilities
None.

## Impact

- Modified: `compose.yaml`, `package.json` (scripts), `README.md`, `.env.example`. New: `scripts/dev-env.ts` (+ test).
- Does not touch `CLAUDE.md`/`AGENTS.md` (the owner has uncommitted edits there); the README is the documentation.
- Owner: Codex (tooling). No other change must land first.
- Linear issue: created when the implementer is delegated.
