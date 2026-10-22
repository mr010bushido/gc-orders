## Context

The catalogue tables and the settings registry (types, defaults, bounds) exist after `catalogue-pricing-config`. The booking form and server both read the catalogue per request, so an edit is live for the next booking, and existing orders are protected by their snapshots.

## Goals / Non-Goals

**Goals:**
- A non-technical owner can fix a price on a phone without breaking the booking form.

**Non-Goals:**
- Reordering, per-field history, scheduling a price change for a future date.

## Decisions

- **One form per section, one save.** Each section posts its fields together and validates them together, so half-saved states cannot arise within a section.
- **Validation lives in `lib/catalogue/admin.ts`** and is shared with the form for inline errors. Add-on prices are whole Kwacha of at least 0 (an included add-on such as Chocolate drip is K0); other prices are whole Kwacha of 1 or more. Multipliers are entered as decimals (`1.20`) and stored in hundredths between 0.10 and 5.00. Percentages and counts follow the registry bounds.
- **Cannot remove the last choice.** Hiding the last active flavour, frosting, size or dessert type is rejected with `LAST_ACTIVE_ITEM`, because the booking form would have nothing to offer. Hiding the last add-on is allowed.
- **Adding a flavour** needs a name and a price group; it appends to the end of the list. Duplicate names within a list are rejected case-insensitively.
- **Phone fields** use `normaliseZambianMobile` and show the national format with spaces. The pickup link must be an `https` URL.
- **Time windows** are start and end times (24-hour, `HH:MM`) with start before end; windows may not overlap.
- **Effect notice.** Each section says "Changes apply to new bookings. Existing bookings keep the prices they were made at."
- **Updated-at** is recorded per setting and shown so the owner can see when something last changed.

## Risks / Trade-offs

- [Typo sets a price to K13] → Registry bounds catch absurd values for fees and rates; item prices only require a positive integer, so the save screen shows the previous value beside the new one before confirming.
- [Owner hides everything by mistake] → `LAST_ACTIVE_ITEM` guard.
- [Concurrent edits] → Last write wins; acceptable for a single owner.
