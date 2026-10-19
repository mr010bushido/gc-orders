## 1. Compose and helpers

- [ ] 1.1 `compose.yaml`: dev service `postgres` (postgres:17, container `gc_postgres_dev`, `restart: unless-stopped`, `127.0.0.1:5435:5432`, named volume `postgres-dev-data`, `pg_isready` healthcheck) and `postgres-test` (`127.0.0.1:5436:5432`, tmpfs data, compose `profiles: ["test"]`); the old 5432 mapping is removed
- [ ] 1.2 `scripts/dev-env.ts` pure helpers (`isLocalDatabaseUrl`, `renderLocalEnv` using the fixed local URLs and a caller-supplied random secret, merge that never overwrites existing keys) with unit tests: locality (localhost, 127.0.0.1, ::1 accepted; hosted hosts, look-alike hosts like `localhost.evil.com`, and malformed URLs rejected) and no-overwrite merge
- [ ] 1.3 `scripts/dev-db.ts` CLI (`setup`, `up`, `down`, `reset`) wrapping `docker compose` (project compose file only), waiting for health, running migrate and seed; `reset` calls the locality guard before touching anything

## 2. Wiring and docs

- [ ] 2.1 `package.json` scripts: `dev:setup`, `db:up`, `db:down`, `db:reset`; `db:migrate` and `db:seed` load `.env.local` with Node's `--env-file-if-exists` and an exported variable still wins
- [ ] 2.2 README "Local database" quickstart replacing the old 5432 instructions (ports, commands, reset warning, where data lives, how to run the disposable test DB for `TEST_DATABASE_URL`); `.env.example` updated to the new local URLs and port
- [ ] 2.3 Real-Docker check from a clean state (remove `.env.local`, `docker compose down -v`): `pnpm dev:setup` succeeds; `pnpm dev` serves `/api/health` with database `ok` and `/book` 200 with the seeded catalogue; rerun of `dev:setup` leaves `.env.local` and edited data untouched; `db:down` then `db:up` keeps data; `db:reset` against a non-local URL refuses. Record the exact commands and results, then stop the container with `pnpm db:down` and delete any throwaway data

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test --maxWorkers=2`, `pnpm build` (with no DATABASE_URL) pass, `pnpm check:portability` passes, `openspec validate local-dev-database --strict` passes
