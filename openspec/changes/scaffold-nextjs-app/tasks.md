## 1. App scaffold

- [x] 1.1 Generate a Next.js App Router + TypeScript + ESLint + Tailwind v4 app at the repo root with pnpm (no `src/` dir); `pnpm dev` serves a page
- [x] 1.2 Import `design/tailwind-theme.css` from `app/globals.css`; remove the generator's default colours and styles
- [x] 1.3 Load Cormorant Garamond and Inter with `next/font/google` and bind them to `--gc-font-display` / `--gc-font-sans`
- [x] 1.4 Add the no-flash theme script and `suppressHydrationWarning` to `app/layout.tsx`; copy `ThemeToggle.tsx` and `StatusPill.tsx` into `components/`
- [x] 1.5 Placeholder landing page: logo, one Cormorant headline, one primary button, ThemeToggle; check it in light and dark

## 2. Pricing port

- [x] 2.1 Write `lib/pricing.test.ts` from the `cake-pricing` spec scenarios (includes the Lusaka UTC edge case)
- [x] 2.2 Implement `lib/pricing.ts` (`quote(input, now)`, integer maths, UTC+2 Lusaka dates) until the tests pass

## 3. Remove Python and switch tooling

- [x] 3.1 Delete `pyproject.toml`, `uv.lock`, `.python-version`, `src/`, `tests/`; update `.gitignore` for Node
- [x] 3.2 Rewrite `.github/workflows/ci.yml`: pnpm install `--frozen-lockfile`, lint, `tsc --noEmit`, vitest, `next build`
- [x] 3.3 Update the commands in `CLAUDE.md` and `README.md`

## 4. Verify

- [ ] 4.1 CI is green on the PR
- [x] 4.2 `openspec validate scaffold-nextjs-app` passes

Local verification: a fresh copy without dependencies or generated Next files passes `pnpm install --frozen-lockfile`, lint, typecheck, 36 Vitest tests in both UTC and America/Los_Angeles, production build and strict OpenSpec validation. Light/dark themes, saved theme reload, fonts, logo, mobile sizing, touch targets and the placeholder action were checked in the browser. The shipped `design/` sources are unchanged.

Task 4.1 remains pending until hosted CI passes on the feature PR against `develop`. The user authorized proceeding with this task after local implementation. Documentation PR #1 remains unchanged; no merge, tag, release or deployment is authorized.
