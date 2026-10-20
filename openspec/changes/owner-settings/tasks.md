## 1. Write functions (Codex)

- [x] 1.1 `lib/catalogue/admin.ts`: update prices and multipliers with validation and `updated_at`; tests for bounds and hundredths conversion — gate: `pnpm test lib/catalogue/admin.test.ts lib/db/migrations.test.ts` (4 passed) and `pnpm typecheck` (passed)
- [x] 1.2 Add, rename, reprice, hide for flavours, frostings, add-ons and dessert types; duplicate-name and `LAST_ACTIVE_ITEM` rules; tests — gate: `pnpm test --maxWorkers=2 lib/catalogue/admin.test.ts lib/catalogue/seed.test.ts lib/catalogue/catalogue.test.ts lib/db/migrations.test.ts` (12 passed; migration suite also passed in final focused rerun), `pnpm typecheck` (passed), `pnpm check:portability` (passed)
- [x] 1.3 Settings writes for fees and rules, time windows (order and overlap checks), payment numbers (normalised), map link (https) and alert phone; tests — gate: `pnpm test --maxWorkers=2 lib/catalogue/admin.test.ts lib/catalogue/settings.test.ts` (14 passed), `pnpm typecheck` (passed), `pnpm check:portability` (passed); legacy integer-hour rows resolve as `HH:00`
- [x] 1.4 Server actions per section with `requireOwner()`, field-error result types and a test that an existing order is unchanged after edits — gate: `pnpm test --maxWorkers=2 lib/catalogue/admin.test.ts app/owner/(console)/settings/actions.integration.test.ts lib/orders/orders.test.ts` (29 passed), `pnpm typecheck`, `pnpm lint`, `pnpm check:portability`, `openspec validate owner-settings --strict` (all passed)

## 2. Screens (Claude)

- [x] 2.1 `/owner/settings` section navigation and the "applies to new bookings" notice — gate: settings page integration test (3 passed), `pnpm typecheck`, `pnpm lint`, `openspec validate owner-settings --strict` (all passed)
- [ ] 2.2 Prices and Sizes sections (grouped flavour list, hide toggle, add form, multipliers as decimals)
- [ ] 2.3 Fees and rules, Time windows, Payment and contact sections with inline errors and a previous-value comparison before saving prices
- [ ] 2.4 Add the Settings item to the owner nav; component tests

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: change a base price in settings, load the booking form data and the quote, and confirm both use it while an existing order keeps its price
- [ ] 3.2 Check at 375px and 1280px in light and dark and note the result on this line
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate owner-settings --strict` passes
