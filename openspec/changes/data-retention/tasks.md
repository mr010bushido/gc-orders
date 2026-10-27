## 1. Domain (Codex)

- [x] 1.1 `lib/retention/constants.ts` (90 days, 2 years, 24 hours, batch size) and date helpers in Lusaka time with boundary tests (day 90/91, leap day, Lusaka midnight) — gate: `pnpm test lib/retention/constants.test.ts` (1 passed), `pnpm lint` (0 warnings)
- [x] 1.2 `lib/orders/anonymise.ts` clears personal columns, POP texts, quote description and images; repeated anonymisation is idempotent — gate: `pnpm test lib/orders/anonymise.test.ts` (1 passed), `pnpm lint` (0 warnings)
- [x] 1.3 `lib/jobs/retention.ts` with four independent bounded steps and storage-before-row deletion — gate: `pnpm test lib/jobs/retention.test.ts` (1 passed), `pnpm lint` (0 warnings), `pnpm typecheck` (passed)
- [x] 1.4 Register the job and the `jobs:retention` health check — gate: `pnpm test lib/jobs/retention-health.test.ts` (1 passed), `pnpm lint` (0 warnings)
- [x] 1.5 Treat anonymised orders as not found in order-tracking lookups; owner `eraseOrderData` guards first and refuses active orders — gate: `pnpm test lib/orders/access.test.ts` (9 passed), `pnpm test 'app/owner/(console)/orders/actions.test.ts'` (1 passed), `pnpm typecheck` (passed)
- [x] 1.6 Consent: booking requires `privacyConsent: true` (`CONSENT_REQUIRED` otherwise), records `orders.privacy_consent_at` on creation and retains it through anonymisation — gate: `pnpm test lib/booking/create-booking.test.ts app/book/wizard.dom.test.tsx` (34 passed), `pnpm lint` (0 warnings), `pnpm typecheck` (passed), `pnpm db:generate` (migration generated; rerun no changes)
- [ ] 1.7 `ops/pg_cron/retention.sql` and systemd timer examples with placeholder secrets

## 2. Screens (Claude)

- [ ] 2.1 `/privacy` page using the shared constants, plain language, one display moment, including the no-targeted-marketing promise
- [ ] 2.2 Booking form consent checkbox (unticked, labelled, links to `/privacy`, error announced when missing) in the details/review step; component tests (owner decision 2026-10-27)
- [ ] 2.3 Owner sheet "Erase personal data" button with confirmation for completed or expired orders; "Anonymised" display in the list
- [ ] 2.4 Component tests

## 3. Verify

- [ ] 3.1 BLOCKED for a human: run the pg_cron SQL in Supabase at production deployment; record when done. (Privacy wording settled by the owner on 2026-10-27: consent for order handling only, no targeted marketing.)
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check:portability` pass; `openspec validate data-retention --strict` passes
