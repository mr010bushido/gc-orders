## Why

The date picker must hide fully booked dates, and the owner decides when a date closes (PRD: suggest "at capacity" at 10 confirmed orders; the owner confirms or overrides). A manual block for holidays uses the same table (PBS Q8, Q20). The data and rules come first so the booking form and the owner screens share one answer.

## What Changes

- Add a `date_decisions` table: a date the owner has closed (reason `capacity` or `manual`, optional note) or kept open despite capacity.
- Add `getClosedDates(db, from, to)` and `isDateOpen(db, date)` for the booking flow, and a server-side re-check at submission.
- Add `getCapacitySuggestions(db, today)`: dates whose count of confirmed and completed orders has reached the capacity setting and that the owner has not decided, or has decided at a lower count.
- Add `closeDate`, `openDate` and `keepOpen` domain functions for the owner screens.

Out of scope: the owner screens (`owner-availability`), the picker UI (`design-system-components`), the booking server action (`booking-flow`).

## Capabilities

### New Capabilities
- `date-availability`: closed dates, capacity suggestions and the owner's decisions on them.

### Modified Capabilities
None.

## Impact

- New: `lib/db/schema/availability.ts`, migration, `lib/availability/*`, tests.
- Owner: Codex. Depends on `order-lifecycle` (counts orders by event date) and the `capacity per day` setting from `catalogue-pricing-config`.
- Linear issue: created when the implementer is delegated.
