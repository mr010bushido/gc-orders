## Why

The design system (`design/DESIGN.md` v1.1) describes ten components, but the repo ships only `StatusPill` and `ThemeToggle`. Every customer and owner screen needs the rest. Building them once, against tokens, keeps later screens from re-inventing or drifting from the design rules.

## What Changes

- Add token-only React components under `components/ui/`: `Button` (primary, ghost), `Input`, `RadioCardGroup`, `AddonList`, `DatePicker`, `Stepper`, `SummaryCard`, `Banner`, `OrderCard`, `Sheet` (bottom sheet on phones, side panel from desktop width).
- Add a dev-only gallery at `/dev/components` that renders every component in light and dark, for visual review. It returns 404 in production.
- Add component tests (Vitest + Testing Library + jsdom) and an automated accessibility check (axe) for each component.
- Components take plain props and know nothing about orders, pricing or the database.

Out of scope: screens, forms wired to server actions, and the `awaiting_quote` status pill (added by `quote-requests`).

## Capabilities

### New Capabilities
- `ui-components`: the component set, its prop contracts, and the design-system and accessibility rules every component must meet.

### Modified Capabilities
None.

## Impact

- New: `components/ui/*`, `app/dev/components/page.tsx`, `vitest.config.mts`, test files.
- New dev dependencies: `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vitest-axe`.
- Owner: Claude (frontend). No dependencies on other changes; can start now.
- Linear issue: created when the implementer is delegated.
