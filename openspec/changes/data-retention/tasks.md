## 1. Domain (Codex)

- [x] 1.1 `lib/retention/constants.ts` (90 days, 2 years, 24 hours, batch size) and date helpers in Lusaka time with boundary tests (day 90/91, leap day, Lusaka midnight) — gate: `pnpm test lib/retention/constants.test.ts` (1 passed), `pnpm lint` (0 warnings)
- [ ] 1.2 `lib/orders/anonymise.ts` clearing personal columns, POP texts, quote description and images; tests for old, recent and repeated runs
- [ ] 1.3 `lib/jobs/retention.ts` with the four steps, batch limits, storage-before-row deletion, independent step failures and the 500 behaviour; PGlite tests with the in-memory `ImageStore`
- [ ] 1.4 Register the job and the `jobs:retention` health check; tests
- [ ] 1.5 Treat anonymised orders as not found in order-tracking lookups, and add the owner `eraseOrderData` action (refuses active orders) with `requireOwner()` and tests
- [ ] 1.6 `ops/pg_cron/retention.sql` and systemd timer examples with placeholder secrets

## 2. Screens (Claude)

- [ ] 2.1 `/privacy` page using the shared constants, plain language, one display moment; link it from the booking form's privacy note
- [ ] 2.2 Owner sheet "Erase personal data" button with confirmation for completed or expired orders; "Anonymised" display in the list
- [ ] 2.3 Component tests

## 3. Verify

- [ ] 3.1 BLOCKED for a human: review the privacy wording and confirm any obligations under the Zambia Data Protection Act 2021; run the pg_cron SQL in Supabase; record when done
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate data-retention --strict` passes
