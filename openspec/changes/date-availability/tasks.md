## 1. Model

- [x] 1.1 Schema and migration for `date_decisions` (RLS on) and an index on `orders (event_date, status)` — gate: pnpm lint, pnpm typecheck, pnpm test lib/db --maxWorkers=2 (35 passed, schema-check enforces RLS/uuid conventions), pnpm check:portability, openspec validate --strict → pass. Deviation: `event_date` is a unique column, not the primary key, because schema-check requires uuid PKs; `state`/`reason`/`confirmed_count_at_decision` carry a shape CHECK

## 2. Queries and decisions

- [x] 2.1 `getClosedDates(db, from, to)` and `isDateOpen(db, date)` with PGlite tests — gate: pnpm lint, pnpm typecheck, pnpm test lib/availability lib/db --maxWorkers=2 (39 passed) → pass. Also fixed 1.1: the `open` shape CHECK let a null count through (null >= 0 is null), tightened and migration 0005 regenerated
- [x] 2.2 `getCapacitySuggestions(db, today)` reading the capacity setting; tests for 10 confirmed, unverified excluded, changed capacity and past dates — gate: pnpm lint, pnpm typecheck, pnpm test lib/availability (9 passed) → pass
- [x] 2.3 `closeDate`, `openDate`, `keepOpen`; tests for override then growth, override with no change, and closing a busy date — gate: pnpm lint, pnpm typecheck, pnpm test lib/availability (15 passed) → pass. `openDate` and `keepOpen` return booleans; `keepOpen` is a no-op on a closed date so it cannot silently undo a block
- [x] 2.4 `assertDateOpen(tx, date)` for the booking transaction, with the `DATE_UNAVAILABLE` error and a test — gate: pnpm lint, pnpm typecheck, pnpm test lib/availability (17 passed) → pass

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate date-availability --strict` passes
