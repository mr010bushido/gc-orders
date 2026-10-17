## Why

The stack is decided: Next.js + TypeScript on Vercel (PBS Q1, Q36). The repo is still a uv/Python project, and its only logic is the pricing engine. Every later change (booking flow, owner dashboard, notifications) needs the TypeScript app to exist first.

## What Changes

- Add a Next.js (App Router) + TypeScript app at the repo root, managed with pnpm.
- Wire the design system: `design/tokens.css` and `design/tailwind-theme.css` through Tailwind v4, Cormorant Garamond + Inter via `next/font`, and the no-flash theme script from `design/DESIGN.md`.
- A placeholder landing page that uses the tokens, to prove the wiring. It is not the real booking UI.
- Port `src/gc_orders/pricing.py` and its tests to TypeScript (`lib/pricing.ts`, Vitest), with behaviour unchanged.
- **BREAKING (tooling)**: delete the Python scaffold (`pyproject.toml`, `uv.lock`, `.python-version`, `src/`, `tests/`).
- CI switches to pnpm: lint, typecheck, test, build.
- Update `CLAUDE.md` and `README.md` commands.

Out of scope: Supabase, Drizzle, auth and env setup. They land with the first change that needs data.

## Capabilities

### New Capabilities
- `cake-pricing`: how a cake's price, short-notice fee and deposit are calculated from flavour group, tier sizes, add-ons, fulfilment and event date.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact

- Removed: all Python code and tooling.
- Added dependencies: next, react, react-dom, tailwindcss v4, typescript, vitest, eslint.
- CI: `.github/workflows/ci.yml` rewritten.
- Vercel: the repo can be connected for preview and production deploys once this merges. Connecting it is a manual step, not part of this change.
