# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Online cake booking for Giuseppe's Cakes (Lusaka, prices in ZMW, shown as `K1,300`). Customers book a cake and get a booking reference (`CAKE-YYYY-NNNN`). They pay a 50% deposit offline by Airtel or MTN mobile money, then paste the confirmation SMS as proof of payment (POP). The owner verifies the POP in a dashboard. There is no payment gateway.

## Sources of truth (in precedence order)

1. `docs/PRD.md`: scope and business rules. Appendix A is the price list; Appendix B is the size/tier multiplier model.
2. `design/DESIGN.md`: design system v1.1. It governs all UI. Tokens live in `design/tokens.css` (light and dark) and `design/tailwind-theme.css` (Tailwind v4).
3. `docs/prototype/cake-booking-prototype.html`: flow reference only. Its styling is superseded by the design system.

`docs/PBS.md` is the product breakdown structure. Its **grilling queue** lists decisions that are still open. Don't assume an answer to an open question; ask, or check whether an OpenSpec spec has settled it.

**Stack: Next.js + TypeScript + pnpm on Vercel (PBS Q1, decided).** Don't add Python code.

## Commands

```sh
pnpm install --frozen-lockfile            # install with Node.js 24
pnpm dev                                 # local development
pnpm lint                                # ESLint
pnpm typecheck                           # generate Next types, then tsc --noEmit
pnpm test                                # all Vitest tests
pnpm test lib/pricing.test.ts             # pricing tests
pnpm build                               # production build
openspec validate scaffold-nextjs-app --strict
```

CI (`.github/workflows/ci.yml`) installs with the frozen pnpm lockfile, then runs lint, typecheck, Vitest and the Next.js build on every PR and on pushes to `main`, `develop`, `release/**` and `hotfix/**`.

## Git workflow (git-flow)

| Branch | From | Merges into | Purpose |
|---|---|---|---|
| `main` | | | Production. Every commit is a tagged release (`v0.1.0`). Never commit directly. |
| `develop` | `main` | | Integration branch. All feature PRs target it. |
| `feature/jms-<n>-<openspec-change>` | `develop` | `develop` (PR) | One Linear issue = one OpenSpec change = one branch. |
| `release/<x.y.z>` | `develop` | `main` + back into `develop` | Stabilise a release; only fixes and version bumps. Tag `v<x.y.z>` on `main`. |
| `hotfix/<x.y.z>` | `main` | `main` + back into `develop` | Urgent production fix. Tag on `main`. |

Rules (follow them even where GitHub doesn't enforce them yet):

Bootstrap exception: `feature/jms-162-scaffold-nextjs-app` starts from the committed `docs/prd-design-system` branch, not `develop`, because the first spec and design sources have not merged into `develop`. Documentation PR #1 stays unchanged. This exception does not include the parent's uncommitted `verify-git-flow` change and does not change the normal feature PR base of `develop`.

- **No direct commits or pushes to `main` or `develop`.** Every change lands through a PR. Never force-push either branch.
- **Only `release/*` and `hotfix/*` merge into `main`.** Feature branches never target `main`.
- **CI must be green before merging** any PR.
- **Merge back after every release or hotfix:** after merging into `main` and tagging `v<x.y.z>`, merge the same branch into `develop` so the two don't drift.
- **Open PRs with an explicit base.** Use `gh pr create --base develop` for features. `main` is GitHub's default branch, so a bare `gh pr create` targets `main`, which is wrong for features.
- **Branch names and PR titles carry the Linear key.** Branch: `feature/jms-162-<openspec-change>`. PR title: `JMS-162: …`. The key links both to the issue.
- **Link to files on `develop` or `main`,** never on a feature branch, in Linear issues and docs. Feature branches are deleted after merge, which breaks the links.
- **Delete the branch after merging,** then run `/opsx:archive` for its change.

## Code

`lib/pricing.ts` is the pure pricing engine, called as `quote(input, now)` and covered by `lib/pricing.test.ts`:

- cake = flavour base × the sum of the tier-size multipliers (8"=0.80 … 16"=1.73, 1–3 tiers)
- a 20% rush fee on the **cake only** when the event is less than 48h away
- add-ons and the flat K150 delivery fee
- a 50% deposit, all rounded to whole Kwacha half-up

`eventDate` is a `YYYY-MM-DD` calendar date. The earliest date is tomorrow in Africa/Lusaka, and the rush window ends at 00:00 UTC+2 on the event date regardless of the server timezone. Amounts use integer hundredths internally, and the deposit uses the unrounded total.

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

Work is tracked in the Linear project **Giuseppe's Cakes Orders** (team Jmsarchy, key `JMS`): https://linear.app/jmsarchy/project/giuseppes-cakes-orders-c1b6dadf4659. Each OpenSpec change gets Linear issue(s) in this project. Reference the issue key (`JMS-123`) in branch names and PR titles (see Git workflow).
