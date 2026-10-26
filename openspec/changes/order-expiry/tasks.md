## 1. Job

- [x] 1.1 `lib/jobs/expire-orders.ts` taking `now`: select up to 100 overdue `awaiting_payment` orders, expire each through the lifecycle transition, collect the ones actually expired; PGlite tests for every `order-expiry` scenario including run twice and the mid-run POP race — gate: `pnpm test lib/jobs/expire-orders.test.ts` → 4 passed
- [x] 1.2 Call `notify('order_expired')` per expired order; test that a provider failure does not stop the run — gate: `pnpm test lib/jobs/expire-orders.test.ts` → 5 passed
- [ ] 1.3 Register the job with the jobs endpoint and test an authorised call records a heartbeat

## 2. Health and ops

- [ ] 2.1 Register the `jobs:expire-orders` health check (45-minute threshold, production only) with tests
- [ ] 2.2 `ops/pg_cron/expire-orders.sql` (15 minutes, `net.http_post`, placeholder secret) and `ops/systemd/expire-orders.{service,timer}` plus a curl example; a test or script confirms no real secret is present
- [ ] 2.3 BLOCKED for a human: run the pg_cron SQL in Supabase with the real `JOBS_SECRET` and app URL; record when done

## 3. Verify

- [ ] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate order-expiry --strict` passes
