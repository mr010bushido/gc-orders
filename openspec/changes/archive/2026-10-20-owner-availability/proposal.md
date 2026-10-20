## Why

The PRD wants the system to suggest closing a date at 10 confirmed orders while the owner stays in control, and Q8 lets the owner block any date for holidays or days off. `date-availability` holds the data and rules; the owner needs a screen to act on them.

## What Changes

- `/owner/dates` with three parts: capacity suggestions (date, confirmed count, pending count, "Close date" and "Keep open"), the list of closed dates (reason, note, "Reopen"), and a form to block any future date with an optional note.
- Each date links to the orders list filtered by that date.
- The block form uses the `DatePicker` with `monthFont="sans"`, because owner screens use Inter only.

Out of scope: automatic closing, recurring blocks (every Sunday), per-window capacity.

## Capabilities

### New Capabilities
- `owner-availability`: the owner's dates screen and its actions.

### Modified Capabilities
None.

## Impact

- New: `app/owner/dates/*`, server actions, tests.
- Cross-cutting: Codex owns the actions; Claude owns the screen and the integration check.
- Depends on `date-availability`, `owner-auth`, `owner-orders` (for the date filter link) and `design-system-components` (which provides the `monthFont` prop).
- Linear issue: created when the implementer is delegated.
