## Context

`fpp_board_backend` runs `postgres:17-alpine` in `docker-compose.dev.yml` on 5433 with fixed dev credentials and a named volume, and a separate test database on 5434. gc-orders already has a Postgres 17 service in `compose.yaml` (added with `database-foundation`) but on 5432, and Node 24 is the runtime.

## Goals / Non-Goals

**Goals:**
- From a clean checkout, `pnpm dev:setup && pnpm dev` gives a working `/book` and a healthy `/api/health`.
- Nothing here can touch a non-local database.

**Non-Goals:**
- Dockerising the app, changing CI, production or Supabase setup.

## Decisions

- **Ports 5435 (dev) and 5436 (test).** The host already holds 5432 and `fpp_board_backend` uses 5433/5434, so sharing a machine never collides. Bound to `127.0.0.1` only.
- **Credentials are fixed and local-only** (`cakes` / `local-cakes-only`, as already documented), so they may appear in `.env.example`, compose and README, as in fpp. They are never used by CI secrets or any hosted environment.
- **`postgres:17`**, matching CI's `migrate-postgres` job, so local and CI behave the same.
- **Named volume** `postgres-dev-data` keeps data across `down`; `db:reset` is the only command that deletes it. The test service uses tmpfs so it is always disposable and behind a compose `profile`, so `docker compose up` for dev never starts it.
- **`.env.local` is generated, not committed** (`.env*` is git-ignored, `.env.example` stays the template). Next.js loads it for `pnpm dev`; the CLI scripts load it with Node's `--env-file-if-exists` so no shell `export` is needed. A real exported variable still wins over the file.
- **`JOBS_SECRET` is generated randomly per developer** with `node:crypto`; no secret literal is committed.
- **`db:reset` and `dev:setup` safety.** Before anything runs, every configured URL (`DATABASE_URL`, `DATABASE_MIGRATION_URL`) must be this project's compose dev database: local host (`localhost`, `127.0.0.1`, `::1`) **and** explicit port 5435 **and** database `cakes`. A host-only check is not enough: this machine has other local Postgres servers (5432, and `fpp_board_backend` on 5433/5434), and migrate plus seed would otherwise write this project's tables into one of them. An absent port means 5432 and is refused, as are the test database (5436) and `?host=`/`?port=`/`?database=` overrides, which postgres.js honours. A hosted URL is refused for the same reason. It only ever runs `docker compose down -v` for this project's compose file.
- **Pure helpers, tested.** URL-locality and compose-dev-database checks and `.env.local` rendering live in `scripts/dev-env.ts` as pure functions with unit tests; the Docker calls stay thin.
