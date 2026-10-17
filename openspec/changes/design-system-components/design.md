## Context

`design/DESIGN.md` is the contract. Tokens are CSS variables in `design/tokens.css`, mapped to Tailwind v4 utilities by `design/tailwind-theme.css`, both already imported by `app/globals.css`. `components/StatusPill.tsx` and `components/ThemeToggle.tsx` exist and are not touched.

## Goals / Non-Goals

**Goals:**
- Every component follows the Non-negotiables list in `DESIGN.md` and is usable by keyboard and screen reader.
- Props are plain data so any screen can drive them, and so they can be tested without a server.

**Non-Goals:**
- Form libraries, validation logic, data fetching, animation libraries, an icon package. Icons the design needs (error, info, warning, success, check, close) are small inline SVGs in one `icons.tsx`.

## Decisions

- **Plain components, no UI kit.** The design is specific (hairlines, brick button, gold-wash totals). shadcn or Radix would be overridden almost everywhere. Exception: `Sheet` handles focus trapping and scroll lock by hand because the native `<dialog>` element with `showModal()` already provides focus trapping, Esc handling and inertness. The bottom-sheet/side-panel layout is CSS only.
- **Dates are `YYYY-MM-DD` strings.** `DatePicker` never builds a local-time `Date` from a date. The caller passes `today` (the Lusaka calendar date), `minDate`, `closedDates` and an `isRush(date)` predicate. This keeps it correct on UTC servers and lets `basket-pricing` and `date-availability` decide the rules.
- **Controlled components.** Value and onChange come from the parent. No internal form state, so the booking wizard can persist state across steps.
- **Test each component with Testing Library and axe.** The gate for a component task is `pnpm test components/ui/<name>`. Visual fidelity is checked in the gallery in light and dark, and noted in the task line.
- **Class names, not CSS modules.** Tailwind utilities from the tokens, as `DESIGN.md` prescribes. A small `cn()` helper joins class strings; no `clsx` dependency.

## Risks / Trade-offs

- [Design drift between the doc and the code] → The gallery shows every state and the tests assert the token class names that carry the rules (for example the rush day uses `bg-warn-bg`).
- [The date picker is the largest component] → It is built last, with month navigation and keyboard arrows tested explicitly.
- [jsdom does not compute layout] → Touch-target size and the phone/desktop switch are asserted through class names and checked visually in the gallery.
