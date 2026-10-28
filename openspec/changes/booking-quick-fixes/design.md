## Context

Three unrelated frontend defects, grouped into one change because each is small. JMS-202 is the tracking key and the change also closes JMS-204 (image upload part) and JMS-209.

## Decisions

- **Uploader key.** Use a module-level counter or `Math.random().toString(36)` with a timestamp. The value is only a React key and a local lookup id: it never reaches the server and needs no cryptographic strength. Do not add a dependency. Do not call `crypto.randomUUID` behind a feature check; the plain fallback is simpler and always works.
- **Landing secondary action.** Per the design system, each screen has one filled brick button, and the secondary action uses the ghost style. Add `<Button variant="ghost" href="/order">Find my booking</Button>` (or the existing equivalent prop) next to or under "Book a Cake". No new display-font text.
- **New/Anonymised tag.** Render the tag inline in the card's top line (next to the reference and date), not absolutely positioned. Keep the existing token colours: New uses `bg-gold-wash text-ink` and is not red; Anonymised uses the hairline-border style. If `OrderCard` needs a slot for it, add an optional `badge` prop rather than positioning from outside. Both tags must stay visible at mobile and desktop widths and must not overlap the total or status pill.

## Risks

- Any test that queries the tag by position or DOM order may need updating.
