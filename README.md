<img src="assets/icon.svg" width="64" height="64" alt="">

# gc-orders

Online cake booking and order management for Giuseppe's Cakes.

- Scope: [`docs/PBS.md`](docs/PBS.md) (product breakdown structure + open questions)
- PRD: [`docs/PRD.md`](docs/PRD.md) · design system: [`design/DESIGN.md`](design/DESIGN.md) · flow prototype: [`docs/prototype/`](docs/prototype/cake-booking-prototype.html)

## Develop

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
openspec validate scaffold-nextjs-app --strict
```

Use Node.js 24 and the pnpm version pinned in `package.json`. The root Next.js App Router app uses TypeScript and Tailwind v4. `design/` remains the source of truth for tokens and branding. The landing page is a placeholder, not a booking flow. No environment variables or external services are required.

`lib/pricing.ts` preserves the cake, add-on, delivery and deposit rules. Calendar dates and the 48-hour rush boundary use Africa/Lusaka, not the server timezone.

Normally branch from `develop` and open feature PRs with an explicit `develop` base. CI runs lint, typecheck, tests and the production build.

Bootstrap exception: `feature/jms-162-scaffold-nextjs-app` is based on committed `docs/prd-design-system`, not `develop`, to include the first OpenSpec change and design sources before documentation PR #1 merges. PR #1 is not merged or retargeted by this work. The parent's uncommitted `verify-git-flow` change is excluded.
