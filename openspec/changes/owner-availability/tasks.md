## 1. Actions (Codex)

- [x] 1.1 Queries for the screen: suggestions with confirmed and pending counts, closed dates with reasons — gate: `pnpm test lib/owner/availability-query.test.ts` → 1 passed
- [x] 1.2 Server actions `closeSuggestedDate`, `keepDateOpen`, `reopenDate`, `blockDate` with `requireOwner()`, past-date and note-length validation; tests for each scenario — gate: `pnpm test lib/owner/availability-actions.test.ts lib/auth/owner-guard-coverage.test.ts` → 22 passed; `pnpm typecheck` and `pnpm lint` passed

## 2. Screen (Claude)

- [x] 2.1 `/owner/dates`: suggestions, closed dates, block form, empty states, links to the orders list — gate: targeted DOM and availability tests → 23 passed; `pnpm typecheck` and `pnpm lint` passed
- [x] 2.2 Add the Dates item to the owner nav; component tests — gate: `pnpm test 'app/owner/(console)/owner-nav.dom.test.tsx'` → 1 passed; `pnpm lint` passed

## 3. Integration (Claude owns this check)

- [x] 3.1 Test: confirm 10 orders for a date, see the suggestion, close it, and verify `isDateOpen` is false and the booking action refuses it — gate: `pnpm test lib/owner/availability-actions.test.ts` → 5 passed
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate owner-availability --strict` passes
