## Context

- `origin/develop` has PR #1 (docs, git-flow) and PR #2 (JMS-162 Next.js scaffold, TS pricing port) merged. `origin/develop:AGENTS.md` contains only the Next.js block that `next dev` regenerates. `origin/develop:CLAUDE.md` has no agent-split, implementer or review rules.
- An untracked draft `AGENTS.md` in the root checkout mirrors `CLAUDE.md` for GPT/Codex: product context, responsibilities, pnpm commands, git-flow, review policy, pricing and design rules, OpenSpec and Linear. It also carries the generated Next.js block.
- T3 can delegate to the `ChatGPT - Personal` provider (GPT-6.x and GPT-5.6 models) and to Claude, each with `isolation:"worktree"`. A worktree starts from the parent's local commit, so uncommitted files are not copied.
- Decided hosting: pilot on Vercel and Supabase, then migrate to a self-hosted VPS. Parts of the roster and guardrails must not assume either platform.
- No Vercel project is connected yet, `vercel` is not logged in, there are no GitHub rulesets or secrets, and Telegram is not configured. A previous Codex run died on an expired token, so no design here may assume unattended Codex availability.
- `.claude/skills/openspec-apply-change` is the generic upstream skill. It pauses with interactive questions, which a delegated background run cannot answer, and it does not know this repo's gate rules.

## Goals / Non-Goals

**Goals:**
- One written source of truth for who owns which work, what an implementer may and may not do, and how a blocker is handed back.
- `CLAUDE.md` and `AGENTS.md` carry the same applicable rules, so either agent behaves the same way.
- An implementer run needs no chat state: everything it needs and everything it leaves behind is in the change directory, the branch and its return message.
- Platform-specific choices are marked pilot-only, so the later VPS move needs no rewrite of these rules.

**Non-Goals:**
- PR reviewers, the security gate and any review trigger (`pr-review-workflow`, `security-baseline`).
- The portability spec, standalone-build check and health endpoint (`platform-portability`).
- Branch protection and the PR policy check (`verify-git-flow`).
- Any unattended trigger. An implementer starts only when the user says go.
- Telegram, webhooks, an always-on host, or any scheduler.

## Decisions

1. **Ownership follows behavior, not folders.** Codex: database and migrations, server actions and routes, auth, pricing, order lifecycle, notifications, security, backend tests. Claude: design-system components, customer booking screens, owner dashboard, accessibility, frontend tests. A feature that crosses both gets one change; its request/response shapes, validation errors and statuses are agreed in the change's spec before tasks are split, and one agent owns the final integration check. *Rejected:* a folder-based split, because Server Actions and route handlers live next to the UI that calls them.
2. **One implementer contract, two bindings.** The contract lives in `.claude/agents/openspec-implementer.md` for Claude; `AGENTS.md` carries a section with the same rules for Codex. `delegate_task` picks the provider per change by its owner. *Rejected:* separate contracts per provider, which drift apart.
3. **The implementer does not wrap the `openspec-apply-change` skill.** It calls `openspec status` and `openspec instructions apply` directly, and its prompt supplies this repo's rules in place of the skill's interactive pauses. *Rejected:* calling the skill from inside the agent, because its pauses would stall a background run.
4. **The change directory is committed before delegation**, and the implementer works on `feature/jms-<n>-<change>` in its own worktree. The coordinator supplies the Linear key; the agent never invents one. Branch naming follows `CLAUDE.md` git-flow, so the later PR needs no rename.
5. **Every OpenSpec change is tracked in Linear, and the issue exists first.** The rule was already implied by "one Linear issue = one OpenSpec change = one branch". It is now stated as a requirement in `agent-roles`, and in both docs, so an agent stops and asks when the issue is missing instead of guessing a key. Creating the issue is an outward-facing action, so an agent does it only when the user asks, as happened for this change (JMS-163).
6. **Blocker = a `BLOCKED:` prefix on the task line, a commit of work so far, and a return.** State lives in `tasks.md`, so a resume needs nothing from chat. The return goes to the T3 coordinator thread. Optionally the coordinator also posts a Linear comment. No other channel exists, because Telegram is not configured.
7. **The implementer commits and stops.** It does not push, open or update PRs, merge, release or deploy. A person pushes and opens the PR with `--base develop`. This is a v1 limit; it can be relaxed later in a change of its own.
8. **Gates are the repo's real commands.** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` where the task affects the build, plus `openspec validate <name> --strict` for the change's artifacts. A task with no meaningful runnable gate names the check it used instead, for example a diff result.
9. **Skill allow/deny list per agent.** Implementers may load `openspec-*` (stripped of interactive pauses), `impeccable`, `web-design-guidelines`, `webapp-testing` and the Vercel React skills for frontend work, and `security-review`, `api-security-review` and `secrets-scan` for backend work. Every unattended agent is denied `deploy-to-vercel`, the `gsd-*` skills, `openspec-propose` and `openspec-archive-change`. Previews come from the Vercel Git integration, so no agent deploys. *Rejected:* an open skill list, because several skills deploy or compete with this workflow.
10. **Portability guardrails are written now and enforced later.** Rules in both files: plain Postgres through Drizzle with migrations in the repo; authorization in server code with RLS as defense in depth and no Supabase Data API; auth, storage and scheduling behind interfaces we own; no `@vercel/*` runtime APIs or Vercel Cron. They are documentation here; `platform-portability` turns them into a spec and CI check.
11. **`AGENTS.md` merges the draft and keeps the generated Next.js block untouched.** The block is rewritten by `next dev`, so dropping it only recreates an uncommitted change. The draft's "Automatic review triggers are not configured" sentence stays true until `pr-review-workflow` lands.
12. **Codex viability is a spike, not an assumption.** Whether a Codex worktree can run `pnpm install` and `vitest` is tested once. If it cannot, backend changes are implemented by Claude and reviewed by Codex until it can.

## Risks / Trade-offs

- [Codex cannot install or test in its sandbox] → Spike task before any delegation. Fall back to Claude as implementer with Codex review.
- [Codex auth expires mid-run] → The run reports failure or BLOCKED. Nothing unattended depends on it, and the user starts every run.
- [CLAUDE.md and AGENTS.md drift] → AGENTS.md states that it mirrors CLAUDE.md. A later check can diff the shared sections; for now the change's tasks verify they agree.
- [The agent reads an ambiguous task as clear] → It works on a branch the user reviews before the PR. The contract says to block whenever two readings give different code.
- [Guardrails without enforcement are ignored] → Accepted for this change. `platform-portability` follows before the first backend change.
- [`delegate_task` cannot set a working directory or agent type, and worktree isolation branches from the coordinator thread's own commit] → The coordinator runs from a checkout on `develop` or the change branch, and the task prompt names the contract file. Found in the dry run (tasks 4.2 and 4.3).
- [The root checkout is still on the stale branch] → The change files are authored there untracked, like `verify-git-flow`. Implementation starts from `develop` in a worktree.

## Migration Plan

Documentation only. After approval and a Linear issue, branch from `develop`, add the agent file, merge the two docs, run the Codex spike and open a PR into `develop`. Rollback is reverting that PR. The VPS move needs no change to this design except dropping the pilot-only skills.

## Open Questions

- Does Codex run `pnpm install` and `vitest` in a worktree? Settled by the spike task.
- Which Linear issue key covers this change? The user assigns it; do not invent one.
