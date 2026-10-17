## Context

`date-availability` provides `getCapacitySuggestions`, `getClosedDates`, `closeDate`, `openDate` and `keepOpen`. The owner screens use only the sans font, but the shared `DatePicker` shows the month name in the display font.

## Goals / Non-Goals

**Goals:**
- The owner can clear all suggestions and see every closed date on one phone-sized screen.

**Non-Goals:**
- Calendar overview of all orders, recurring rules.

## Decisions

- **List first, not a calendar.** Suggestions and closed dates are short lists; a month grid adds nothing the lists do not. The block form uses the date picker in its owner variant.
- **Pending counts shown beside confirmed.** The owner sees "10 confirmed, 3 awaiting" so they can judge before closing; only confirmed ones drive the suggestion.
- **Actions are server actions guarded by `requireOwner()`**, calling the domain functions. Closing a date that already has orders shows a notice that existing orders are unaffected.
- **Past dates cannot be blocked.** The picker's minimum date is today (Lusaka).

## Risks / Trade-offs

- [Owner closes the wrong date] → "Reopen" is one tap and nothing else depends on the row.
