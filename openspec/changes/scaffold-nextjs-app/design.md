## Context

The repo is a uv/Python project whose only logic is `src/gc_orders/pricing.py`, with 6 tests. The PRD and design system target Next.js on Vercel, and grilling settled the stack: Next.js + TS, Supabase, Resend and Twilio (PBS Q1, Q25, Q30, Q34, Q36). This change establishes the app shell every later change builds on.

## Goals / Non-Goals

**Goals:**
- A Next.js App Router app that builds and deploys on Vercel Hobby.
- Design tokens wired exactly as `design/DESIGN.md` prescribes, so later UI work only references tokens.
- Pricing ported with identical results, and a Lusaka-timezone fix for date handling.
- CI gates PRs on lint, typecheck, test and build.

**Non-Goals:**
- Supabase, Drizzle, auth, environment variables, real pages, owner-editable pricing. Each lands with the change that needs it.

## Decisions

- **App at repo root, no `src/` dir, no monorepo.** It's one app; a workspace layout adds nothing.
- **pnpm + Vitest.** Vitest runs TS natively, with no Babel/Jest config. `create-next-app` provides ESLint.
- **Tokens stay in `design/`, imported from `app/globals.css`.** `design/` is the single source of truth (DESIGN.md says so); copying files into `app/` would fork them. `tailwind-theme.css` imports `./tokens.css` relatively, so importing it from `design/` works unchanged.
- **Fonts via `next/font/google`.** Cormorant Garamond (400/500/600, normal + italic) and Inter (400/500/600), exposed as CSS variables and assigned to `--gc-font-display` / `--gc-font-sans`.
- **Pricing as a pure function `quote(input, now)` in `lib/pricing.ts`, with integer Kwacha maths.** Every price × multiplier is computed in hundredths (multipliers × 100 are integers), so there's no float drift and no decimal library.
- **Lusaka time is a fixed UTC+2 offset.** Zambia has no DST, so midnight on the event date is `Date.UTC(y, m-1, d) - 2h`. The Python version used naive local time, which would be wrong on Vercel's UTC servers. This is a deliberate fix, captured in the spec.
- **Placeholder landing page** with the logo, one Cormorant headline and one primary button, to verify tokens, fonts and dark mode visually. The booking-flow change replaces it.

## Risks / Trade-offs

- [Deleting Python loses the reference implementation] → The spec scenarios and ported tests carry the behaviour. Git history keeps the Python file.
- [Hard-coded catalogue constants] → Accepted until the owner-settings change moves them to the database (PBS Q27). The function signature takes values from the constants, so that swap is local.
- [The `create-next-app` default template drifts between versions] → Pin the versions the generator produces in `pnpm-lock.yaml`. CI uses `--frozen-lockfile`.

## Migration Plan

One PR: add the app, port and pass the tests, delete Python, swap CI. Rollback = revert the PR. After merge, connect the repo in Vercel (manual) for preview and production deploys.
