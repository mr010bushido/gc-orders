## Why

Work on this repo will be split between Claude and GPT/Codex, with unattended implementer runs and independent PR review to follow. Today nothing says who owns what, what an implementer may do on its own, or how it hands back a question. `AGENTS.md` on `develop` holds only the generated Next.js block, `CLAUDE.md` has no agent rules, and an untracked draft `AGENTS.md` exists only in the root checkout. The agreed roles and limits need to be settled and recorded before any reviewer or security automation is built on them.

## What Changes

- Record the agent roster and ownership rules: Codex owns backend, Claude owns frontend, ownership follows behavior and not folders, and a feature that crosses both gets one OpenSpec change with its request/response shapes agreed before the work is split.
- Define the `openspec-implementer` contract: one agreed change per run, in an isolated worktree, a runnable gate on each ticked task line, deviations rewritten in place, and `BLOCKED: <question>` plus a structured return instead of guessing. Gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate <name> --strict`.
- Fix what implementers may never do: propose, archive, push, open or merge PRs, deploy, edit Vercel, Supabase, GitHub or Linear settings, or hold production secrets.
- Make the tracking rule explicit in both docs and the spec: every OpenSpec change must have a Linear issue before its branch exists, and the key appears in the branch name and PR title. This change's issue is JMS-163.
- Add the per-agent skill allow-list and deny-list. `deploy-to-vercel` and the `gsd-*` skills are denied to every unattended agent.
- Add `.claude/agents/openspec-implementer.md` for Claude. Codex reads the same contract from a new section in `AGENTS.md`.
- Merge the draft `AGENTS.md` into the tracked file, keep the generated Next.js block, and add the matching rules to `CLAUDE.md`.
- Add the portability guardrails to both files: plain Postgres through Drizzle, server-side authorization with RLS as defense in depth, auth, storage and scheduling behind interfaces we own, and no Vercel-only runtime features. The enforceable parts are specified later in `platform-portability`.
- Run a Codex sandbox spike: can it run `pnpm install` and `vitest` in a worktree? The result decides whether backend implementation can be delegated to Codex.

Not in this change: reviewers and the security gate (`pr-review-workflow`, `security-baseline`), the portability spec and CI check (`platform-portability`), branch protection (`verify-git-flow`), and the sentinel. Review automation, if any, is manual or T3-triggered; this change enables none.

## Capabilities

### New Capabilities
- `agent-roles`: the roster, backend/frontend ownership and cross-cutting rules, the limits that apply to every agent, skill allow/deny lists, and the portability guardrails agents must follow.
- `openspec-implementer`: the contract for implementing an agreed OpenSpec change unattended in a worktree, including gates, in-place deviations, the BLOCKED protocol and the structured return.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact

- New: `.claude/agents/openspec-implementer.md`.
- Modified: `AGENTS.md` (merge the draft, keep the generated block) and `CLAUDE.md` (agent roster, ownership, implementer workflow, guardrails). Documentation only: no application code, dependencies, CI or repository settings change.
- Tracked as Linear issue JMS-163, so the implementation branch is `feature/jms-163-agent-workflow`.
- Depends on nothing. It should be merged before `pr-review-workflow` and `platform-portability`, which build on these roles.
