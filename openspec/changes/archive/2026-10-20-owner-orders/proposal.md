## Why

The owner needs to see orders, check the pasted proof of payment against their mobile money statement, and move each order along (PRD owner dashboard 1 and 2; PBS 3.2 to 3.7, 3.10, Q7, Q9, Q23, D3, D4).

## What Changes

- `/owner/orders`: a list of order cards sorted by event date, a chip per status and a "Flagged" chip, a filter by event date (used by the dates screen), and a highlight on orders the owner has not opened (New).
- Order detail in the shared sheet (bottom sheet on phones, side panel on desktop), deep-linkable with `?order=<reference>`: customer, tap-to-call and WhatsApp buttons, fulfilment and address, event date and time window, notes, every priced line, total, deposit and balance, the latest POP text and earlier submissions, and the status timeline.
- Actions: Verify (one click, with a confirmation of amount and reference), Flag with a note and Clear flag, Mark completed (warns when the balance is unpaid), Balance paid (method and note).
- Opening an order marks it seen. Verify sends the customer's confirmation through `notify`.

Out of scope: editing an order, search, bulk actions, quote pricing (`quote-requests`), date blocking (`owner-availability`).

## Capabilities

### New Capabilities
- `owner-orders`: the order list, filters, detail sheet and owner actions.

### Modified Capabilities
None.

## Impact

- New: `app/owner/orders/*`, `lib/owner/orders-query.ts`, server actions, tests.
- Cross-cutting: Codex owns queries and actions; Claude owns the screens and the integration check.
- Depends on `order-lifecycle`, `design-system-components`, `notifications`, `owner-auth`.
- Linear issue: created when the implementer is delegated.
