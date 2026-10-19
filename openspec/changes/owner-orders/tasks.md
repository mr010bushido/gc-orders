## 1. Queries and actions (Codex)

- [x] 1.1 `lib/owner/orders-query.ts`: filters, sort, date filter, cursor, effective-status filtering done correctly for lapsed orders; PGlite tests — gate: pnpm test lib/owner/orders-query.test.ts --maxWorkers=2, pnpm lint, pnpm typecheck → 2 passed; all gates passed
- [ ] 1.2 Server actions `verifyOrder`, `flagOrder`, `clearFlag`, `completeOrder`, `recordBalancePaid`, `markSeen`: guard, lifecycle call with actor `owner`, result types; tests including no session and the two-tab case
- [ ] 1.3 `verifyOrder` calls `notify('deposit_verified')` after commit; a provider failure does not fail the action (test)
- [ ] 1.4 Link helpers for `tel:` and `wa.me`, with tests

## 2. Screens (Claude)

- [ ] 2.1 `/owner/orders` list with chips, sort, date filter, New highlight and "Load more"
- [ ] 2.2 Order sheet: details, lines, POP text and history, timeline, deep link
- [ ] 2.3 Action bar and dialogs: Verify confirmation, Flag with note, Complete warning, Balance paid form
- [ ] 2.4 Component tests for each status and for plain-text POP rendering
- [ ] 2.5 Add the Orders item to the owner nav

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: create orders in each status, open each sheet, run verify, flag and complete flows against a PGlite database
- [ ] 3.2 Check at 375px and 1280px in light and dark and note the result on this line
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate owner-orders --strict` passes
