# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online cake booking for Giuseppe's Cakes (Lusaka, prices in ZMW, shown as `K1,300`). Customers book a cake and get a booking reference (`CAKE-YYYY-NNNN`). They pay a 50% deposit offline by Airtel or MTN mobile money, then paste the confirmation SMS as proof of payment (POP). The owner verifies the POP in a dashboard. There is no payment gateway.

## Sources of truth (in precedence order)

1. `docs/PRD.md`: scope and business rules. Appendix A is the price list; Appendix B is the size/tier multiplier model.
2. `design/DESIGN.md`: design system v1.1. It governs all UI. Tokens live in `design/tokens.css` (light and dark) and `design/tailwind-theme.css` (Tailwind v4).
3. `docs/prototype/cake-booking-prototype.html`: flow reference only. Its styling is superseded by the design system.

`docs/PBS.md` is the product breakdown structure. Its **grilling queue** lists decisions that are still open. Don't assume an answer to an open question; ask, or check whether an OpenSpec spec has settled it.

**Stack: Next.js + TypeScript on Vercel (PBS Q1, decided).** The uv/Python scaffold is to be replaced; don't add Python code.

## Commands

```sh
uv sync                                  # install
uv run pytest                            # all tests
uv run pytest tests/test_pricing.py::test_rush_fee_applies_to_cake_only   # one test
uv run ruff check . && uv run ruff format .
```

CI (`.github/workflows/ci.yml`) runs `ruff check`, `ruff format --check` and `pytest` on PRs and on pushes to `main`. `main` is the default branch. Work on a branch and open a PR.

## Code

`src/gc_orders/pricing.py` is the pricing engine:

- cake = flavour base × the sum of the tier-size multipliers (8"=0.80 … 16"=1.73, 1–3 tiers)
- a 20% rush fee on the **cake only** when the event is less than 48h away
- add-ons and the flat K150 delivery fee
- a 50% deposit, all rounded to whole Kwacha half-up

The PRD requires the prices and multipliers to become owner-editable config, so the module-level constants are temporary.

## Design system rules that are easy to break

- Colour comes from tokens only, never a hex value in a component. Dark mode swaps the tokens; never write `dark:` colour overrides.
- Allow one Cormorant (display font) moment per screen. Owner screens use Inter only.
- Use hairline borders, not shadows. `shadow-float` is only for sheets, menus and toasts.
- Each screen has one filled brick (primary) button; the secondary action uses the ghost style.
- Never use gold for text.
- Order statuses and pill colours are fixed in `design/components/StatusPill.tsx`.

## Specs: always use OpenSpec

Manage every spec through the OpenSpec family (`openspec` CLI + `.claude/skills/openspec-*` + `/opsx:*` commands). Don't write ad-hoc spec docs elsewhere.

- `/opsx:explore`: think through a PRD area or open question before committing to it.
- `/opsx:propose <name>`: create `openspec/changes/<name>/` with proposal, design, spec deltas and tasks. Use one change per PBS area or feature slice.
- `/opsx:apply`: implement a change's tasks.
- `/opsx:archive`: after merge, fold the change's spec deltas into `openspec/specs/`.

`openspec/specs/` holds the current agreed behaviour. When a grilling question is settled, record it in the relevant spec, then update its row in the PBS grilling queue.

## Tracking: Linear

Work is tracked in the Linear project **Giuseppe's Cakes Orders** (team Jmsarchy, key `JMS`): https://linear.app/jmsarchy/project/giuseppes-cakes-orders-c1b6dadf4659. Each OpenSpec change gets Linear issue(s) in this project. Reference the issue key (`JMS-123`) in branch names and PR titles.
