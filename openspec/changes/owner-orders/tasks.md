## 1. Queries and actions (Codex)

- [x] 1.1 `lib/owner/orders-query.ts`: filters, sort, date filter, cursor, effective-status filtering done correctly for lapsed orders; PGlite tests — gate: pnpm test lib/owner/orders-query.test.ts --maxWorkers=2, pnpm lint, pnpm typecheck → 2 passed; all gates passed
- [x] 1.2 Server actions `verifyOrder`, `flagOrder`, `clearFlag`, `completeOrder`, `recordBalancePaid`, `markSeen`: guard, lifecycle call with actor `owner`, result types; tests including no session and the two-tab case — gate: pnpm test lib/owner/order-actions.test.ts lib/owner/order-links.test.ts lib/auth/require-owner.test.ts lib/auth/owner-guard-coverage.test.ts --maxWorkers=2, pnpm lint, pnpm typecheck → 26 passed; all gates passed (no-session behavior covered by ownerForRequest fail-closed test)
- [x] 1.3 `verifyOrder` calls `notify(deposit_verified)` after commit; a provider failure does not fail the action (test) — gate: pnpm test lib/owner/order-actions.test.ts --maxWorkers=2 → 2 passed; notification scheduled with Next `after()`
- [x] 1.4 Link helpers for `tel:` and `wa.me`, with tests — gate: pnpm test lib/owner/order-links.test.ts --maxWorkers=2 → 3 passed

## 2. Screens (Claude)

- [x] 2.1 `/owner/orders` list with chips, sort, date filter, New highlight and "Load more" — added live `awaiting_quote` pill parity with the settled design reference; fixed optional search params for direct page tests — gate: `pnpm test lib/owner/orders-query.test.ts --maxWorkers=2`, `pnpm lint`, `pnpm typecheck` → 2 passed; all gates passed
- [x] 2.2 Order sheet: details, lines, POP text and history, timeline, deep link; detail lookup is independent of list filters — gate: `pnpm lint`, `pnpm typecheck`, `pnpm test lib/owner/orders-query.test.ts components/ui/OrderCard.test.tsx --maxWorkers=2` → 5 passed; all gates passed (one unused-state lint warning to resolve in 2.3)
- [x] 2.3 Action bar and dialogs: Verify confirmation, Flag with required note, Complete balance warning, Balance paid method/note form — gate: `pnpm lint`, `pnpm typecheck` → passed (no errors)
- [x] 2.4 Component tests for all six order statuses including `awaiting_quote`, plus literal plain-text rendering for hostile POP and notes — gate: `pnpm test components/StatusPill.test.tsx components/ui/OrderDetailSheet.test.tsx --maxWorkers=2` → 9 passed; `pnpm lint`, `pnpm typecheck` → passed
- [x] 2.5 Add the Orders item to the owner nav — already present in `app/owner/(console)/owner-nav.tsx`; verified its `/owner/orders` link and active route state in source (no change required)

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: create orders in each status, open each sheet, run verify, flag and complete flows against a PGlite database
- [ ] 3.2 Check at 375px and 1280px in light and dark and note the result on this line
- [ ] 3.3 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate owner-orders --strict` passes
