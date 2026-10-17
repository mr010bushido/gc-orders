## Context

Decisions already made (PBS): one basket per order (Q17); statuses Awaiting payment → Awaiting verification → Confirmed → Completed, plus Expired, with "New" meaning unseen by the owner (Q9); flag is a badge plus a note and the status stays Awaiting verification (Q7); balance is tracked (Q23); each order snapshots its line prices (Q28); every status change stores a timestamp and its actor, with no field-level audit log (D4); one reference sequence for all order types that resets yearly (Q38); phones are Zambian only (Q37).

## Goals / Non-Goals

**Goals:**
- One module owns every state change, so no screen can put an order into an illegal state.
- All personal data lives in few, known places so `data-retention` can anonymise it in one pass.

**Non-Goals:**
- Sending messages on transitions (`notifications` calls these functions' results), authorisation (callers pass an actor and the action layer checks the owner session), cancellation and refunds (handled by the owner outside the app).

## Decisions

- **Snapshot as `order_lines`.** One row per priced line (`kind`, `label`, `quantity`, `unit_amount`, `amount`, `meta jsonb`), copied from the `basket-pricing` result, plus `total` and `deposit` on the order. The cake line's `meta` holds flavour, diet, frosting and tiers. Nothing reads the live catalogue to display or reprice an order. This replaces the PBS sketch of `order_tiers` and `order_addons`; the lines carry the same information with one structure.
- **Transitions are SQL compare-and-set.** `update orders set status = $to … where id = $id and status = $from returning *`. Zero rows means `INVALID_TRANSITION`. Two concurrent verifies cannot both succeed. Each transition writes its event row in the same transaction.
- **Allowed transitions:** `send_quote` (`awaiting_quote` → `awaiting_payment`, owner), `submit_pop` (`awaiting_payment` → `awaiting_verification`, customer), `verify` (`awaiting_verification` → `confirmed`, owner), `complete` (`confirmed` → `completed`, owner), `expire` (`awaiting_payment` → `expired`, system) and `decline` (`awaiting_quote` → `expired`, owner, for a quote request the owner will not take). Expired is final in v1: a late payer rebooks.
- **Actor includes `customer`.** D4 names owner and system, but the customer's POP submission is also a transition, so it records `customer`.
- **Payment deadline is a column.** `payment_due_at` is set to entry into `awaiting_payment` plus the `expiry hours` setting (24). For quote orders the clock therefore starts when the quote is sent (Q21). `effectiveStatus` compares it to `now`.
- **Flag is orthogonal.** `flagged_at` and `flag_note` on the order; set or cleared only while `awaiting_verification`. A flagged order never expires because expiry applies only to `awaiting_payment`. Verifying a flagged order clears the flag and keeps the note.
- **Resubmitted POP.** While flagged, the customer may submit new text; each submission is a `pop_submissions` row and the latest is shown. The status does not change again.
- **Balance.** `balance_paid_at`, `balance_method` (airtel, mtn, cash, bank, other) and `balance_note`. Balance due is `total - deposit`. Allowed in `confirmed` and `completed`. Completing an order with an unpaid balance succeeds and the result says `balanceUnpaid: true`; the UI warns first.
- **Access token.** 32 random bytes, base64url. Only its SHA-256 is stored (`access_token_hash`, unique). The plaintext is returned once by `createOrder` for the notification link. Lookup compares hashes.
- **Reference counter.** `reference_counters(year, last_number)` with `insert … on conflict do update set last_number = last_number + 1 returning` inside the order transaction, so a rolled-back order releases its number. The year is the Lusaka year at creation. Numbers are zero-padded to 4 digits and grow beyond that.
- **PII location.** Name, phone, email, delivery address, design notes, topper message and `pop_submissions.text`. The PII columns on `orders` are nullable, guarded by a check that requires them unless `anonymised_at` is set, so `data-retention` can clear them in one update while keeping reference, event date, lines, totals, status and timeline as business records.

## Risks / Trade-offs

- [Two orders at the same instant contend on the counter row] → One short row lock per booking; volume is tiny.
- [`meta jsonb` is untyped] → A zod schema per line kind validates on write and read.
- [No reinstatement of expired orders] → Rare; the owner can ask the customer to rebook. Revisit if it happens often.
- [Number format] → Mobile prefixes 5, 7 and 9 are accepted after `+260`; a wider rule can be a one-line change.
