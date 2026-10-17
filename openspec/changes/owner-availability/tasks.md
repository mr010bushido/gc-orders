## 1. Actions (Codex)

- [ ] 1.1 Queries for the screen: suggestions with confirmed and pending counts, closed dates with reasons
- [ ] 1.2 Server actions `closeSuggestedDate`, `keepDateOpen`, `reopenDate`, `blockDate` with `requireOwner()`, past-date and note-length validation; tests for each scenario

## 2. Screen (Claude)

- [ ] 2.1 `/owner/dates`: suggestions, closed dates, block form, empty states, links to the orders list
- [ ] 2.2 Add the Dates item to the owner nav; component tests

## 3. Integration (Claude owns this check)

- [ ] 3.1 Test: confirm 10 orders for a date, see the suggestion, close it, and verify `isDateOpen` is false and the booking action refuses it
- [ ] 3.2 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass; `openspec validate owner-availability --strict` passes
