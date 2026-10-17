## 1. Test setup

- [x] 1.1 Add `vitest.config.ts` (jsdom for `components/**`, node elsewhere) and dev dependencies `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vitest-axe`; existing tests still pass — gate: pnpm test → 80 passed; pnpm lint, pnpm typecheck → pass
- [ ] 1.2 Add `components/ui/cn.ts`, `components/ui/icons.tsx` and a test that fails on hex colours or `dark:` colour classes in `components/ui/*.tsx`

## 2. Form components

- [ ] 2.1 `Button` (primary, ghost, link form) with tests
- [ ] 2.2 `Input` with label, helper and error states, with tests
- [ ] 2.3 `RadioCardGroup` with keyboard tests
- [ ] 2.4 `AddonList` with tests

## 3. Booking components

- [ ] 3.1 `Stepper` (phone segments, tablet circles) with tests
- [ ] 3.2 `Banner` with tests (warning has `role="alert"`)
- [ ] 3.3 `SummaryCard` and a `formatKwacha` helper with tests
- [ ] 3.4 `DatePicker` with month grid, rush/closed/past states, min date and keyboard navigation and the `monthFont` prop (display or sans), with tests

## 4. Owner components

- [ ] 4.1 `OrderCard` using the existing `StatusPill`, with tests
- [ ] 4.2 `Sheet` on native `<dialog>` with bottom-sheet and side-panel layouts, focus return, with tests

## 5. Gallery and checks

- [ ] 5.1 `app/dev/components/page.tsx` showing every component and state; 404 in production
- [ ] 5.2 Axe check for every component in one test file
- [ ] 5.3 Check the gallery in light and dark at 375px and 1280px and note the result on this line
- [ ] 5.4 `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `openspec validate design-system-components --strict` passes
