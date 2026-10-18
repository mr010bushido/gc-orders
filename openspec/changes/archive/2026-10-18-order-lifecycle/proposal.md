## Why

Orders are the centre of the product, and nothing stores them yet. The booking flow, order tracking, notifications, expiry and the owner dashboard all depend on one agreed order model: its tables, statuses and legal transitions, reference numbers, proof of payment, flag, balance and timeline.

## What Changes

- Add order tables: `orders`, `order_lines` (the price snapshot), `pop_submissions`, `order_status_events` and `reference_counters`.
- Add `createOrder` that stores a priced basket with a snapshot of its lines, a `CAKE-YYYY-NNNN` reference and an unguessable access token (stored hashed).
- Add the status machine: `awaiting_quote` → `awaiting_payment` → `awaiting_verification` → `confirmed` → `completed`, and `expired` from `awaiting_payment` (or from `awaiting_quote` when the owner declines a request). Every transition records a timestamp and an actor.
- Add proof-of-payment submission, the owner flag (a badge with a note, not a status), the balance-paid record, and the "unseen by owner" marker that drives the New highlight.
- Add `effectiveStatus(order, now)` so reads treat an unpaid order past its deadline as expired even before the job runs.
- Add Zambian mobile number normalisation to `+260…`.

Out of scope: the booking form, the owner UI, the expiry job (`order-expiry`), notifications, images and the quote-request creation flow.

## Capabilities

### New Capabilities
- `order-lifecycle`: order storage, price snapshot, statuses and transitions, POP, flag, balance, owner-seen marker, timeline, effective status.
- `booking-reference`: unique sequential `CAKE-YYYY-NNNN` references.
- `phone-numbers`: validation and normalisation of Zambian mobile numbers.

### Modified Capabilities
None.

## Impact

- New: `lib/db/schema/orders.ts`, migration, `lib/orders/*`, `lib/phone.ts`, tests.
- Owner: Codex. Depends on `catalogue-pricing-config` (and so on `database-foundation`, `basket-pricing`).
- Linear issue: created when the implementer is delegated.
