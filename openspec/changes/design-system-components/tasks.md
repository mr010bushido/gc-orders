## 1. Test setup

- [x] 1.1 Add `vitest.config.ts` (jsdom for `components/**`, node elsewhere) and dev dependencies `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vitest-axe`; existing tests still pass — gate: pnpm test → 80 passed; pnpm lint, pnpm typecheck → pass
- [x] 1.2 Add `components/ui/cn.ts`, `components/ui/icons.tsx` and a test that fails on hex colours or `dark:` colour classes in `components/ui/*.tsx` (the scan also rejects `rgb()`/`hsl()` and any `shadow-float` outside `Sheet.tsx`) — gate: pnpm test components/ui → 4 passed; pnpm lint, pnpm typecheck → pass

## 2. Form components

- [x] 2.1 `Button` (primary, ghost, link form) with tests (added `vitest.setup.ts` with Testing Library cleanup for the jsdom project) — gate: pnpm test components/ui/Button → 5 passed; pnpm lint, pnpm typecheck → pass
- [x] 2.2 `Input` with label, helper and error states, with tests — gate: pnpm test components/ui/Input → 4 passed; pnpm lint, pnpm typecheck → pass
- [x] 2.3 `RadioCardGroup` with keyboard tests (arrow keys come from the native radio group, no custom key handler) — gate: pnpm test components/ui/RadioCardGroup → 4 passed; pnpm lint, pnpm typecheck → pass
- [x] 2.4 `AddonList` with tests (prices are whole-Kwacha numbers, so `formatKwacha` in `components/ui/format.ts` was added here rather than in 3.3) — gate: pnpm test components/ui/AddonList → 3 passed; pnpm lint, pnpm typecheck → pass

## 3. Booking components

- [x] 3.1 `Stepper` (phone segments, tablet circles) with tests (tablet switch at the `md` breakpoint) — gate: pnpm test components/ui/Stepper → 4 passed; pnpm lint, pnpm typecheck → pass
- [x] 3.2 `Banner` with tests (warning has `role="alert"`) — gate: pnpm test components/ui/Banner → 4 passed; pnpm lint, pnpm typecheck → pass
- [x] 3.3 `SummaryCard` and a `formatKwacha` helper with tests (`formatKwacha` itself was added in 2.4; its tests are in `components/ui/format.test.ts`) — gate: pnpm test components/ui/SummaryCard components/ui/format → 9 passed; pnpm lint, pnpm typecheck → pass
- [x] 3.4 `DatePicker` with month grid, rush/closed/past states, min date and keyboard navigation and the `monthFont` prop (display or sans), with tests (weeks start on Monday; unavailable days use `aria-disabled` so arrow keys can still pass through them; the month name is a live `<p>`, not a heading, so the component never breaks a screen's heading order) — gate: pnpm test components/ui/DatePicker → 9 passed; pnpm lint, pnpm typecheck → pass

## 4. Owner components

- [x] 4.1 `OrderCard` using the existing `StatusPill`, with tests (renders a `<button>` with `aria-current` when given `onSelect`, otherwise a plain block) — gate: pnpm test components/ui/OrderCard → 3 passed; pnpm lint, pnpm typecheck → pass
- [x] 4.2 `Sheet` on native `<dialog>` with bottom-sheet and side-panel layouts, focus return, with tests (jsdom has no `showModal`, so `vitest.setup.ts` mirrors the browser: showModal/close, the `close` event and Escape → `cancel`; scroll lock is one CSS rule in `app/globals.css`; `Button` gained a `block` prop so the 1fr/2fr action bar stays full width) — gate: pnpm test components/ui → 65 passed; pnpm lint, pnpm typecheck → pass

## 5. Gallery and checks

- [x] 5.1 `app/dev/components/page.tsx` showing every component and state; 404 in production (client gallery in `app/dev/components/Gallery.tsx`; the page calls `notFound()` when `NODE_ENV` is production; it is a catalogue, so it shows several primaries and both month fonts on purpose) — gate: pnpm test → 147 passed (incl. `app/dev/components/page.test.ts`); pnpm lint, pnpm typecheck, pnpm build → pass; `pnpm start` → `/dev/components` 404, `/` 200
- [ ] 5.2 Axe check for every component in one test file
- [ ] 5.3 Check the gallery in light and dark at 375px and 1280px and note the result on this line
- [ ] 5.4 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate design-system-components --strict` passes
