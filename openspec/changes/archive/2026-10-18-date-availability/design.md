## Context

Only confirmed orders count toward capacity (PBS Q20). Unpaid and unverified orders do not close a date, so a flood of unpaid bookings cannot block it; the owner sees pending orders for a date in the owner screens and decides. A closed date is closed to new bookings only; existing orders keep their date.

## Goals / Non-Goals

**Goals:**
- One table for capacity closures, manual blocks and "kept open" overrides.
- Suggestions are computed, never stored, so they cannot go stale.

**Non-Goals:**
- Automatic closing, per-time-window capacity, a booking horizon setting (the picker offers the next 12 months, a constant).

## Decisions

- **`date_decisions(event_date pk, state, reason, note, confirmed_count_at_decision, decided_at)`.** `state` is `closed` or `open`. `closed` with reason `capacity` or `manual`. `open` records the owner's override of a capacity suggestion together with the count at that moment.
- **Suggestions reappear on growth.** A kept-open date is suggested again only when its confirmed count exceeds the count recorded at the decision. A closed date is never suggested.
- **Completed orders count too.** A same-day completed order still occupied the date, so the count is confirmed plus completed, grouped by `event_date`.
- **Dates are strings and `date` columns.** No `Date` objects cross the function boundary.
- **Server re-check.** The booking action calls `isDateOpen` inside its transaction. A date closed after the customer opened the form produces `DATE_UNAVAILABLE`, not a silent booking.

## Risks / Trade-offs

- [Owner is slow to confirm and the date overfills] → Accepted; the PRD wants the owner in control. The suggestion list is the nudge.
- [Counting by `event_date` without an index] → An index on `(event_date, status)` is part of the migration.
