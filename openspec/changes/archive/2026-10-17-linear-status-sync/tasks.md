## 1. Documentation

- [x] 1.1 In the shared "Implementing an OpenSpec change" section of `CLAUDE.md` and `AGENTS.md`, add the status rule: In Progress on branch creation, In Review on PR open, Done when the archive PR merges; the coordinator updates and reports it, implementers never touch Linear. Keep the section word for word identical in both files. Gate: `cmp` of the shared sections (from `## Agent roster and ownership` to the next unshared heading) is identical, and the `nextjs-agent-rules` block in `AGENTS.md` is byte-identical to `origin/develop`. Result: added as item 10 of the shared section in both files; shared sections (`## Agent roster and ownership` through `## Portability guardrails`) diff-identical, `nextjs-agent-rules` block identical to `origin/develop`.
- [x] 1.2 Append "Set the Linear issue to Done once the archive PR merges." to the branch-cleanup rule in `CLAUDE.md` (the line about deleting the branch then running `/opsx:archive`) and to the equivalent line in `AGENTS.md`. Gate: `git diff` of each file shows only that sentence on those lines. Result: `git diff` shows only that sentence appended on `CLAUDE.md` line 55 and `AGENTS.md` line 99.

## 2. Verify

- [x] 2.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate linear-status-sync --strict`. Gate: all pass, since only docs changed. Result: lint, typecheck, test (38 passed), build and `openspec validate linear-status-sync --strict` all exit 0.
- [x] 2.2 Commit on `feature/jms-164-linear-status-sync`. Do not push or open a PR; the coordinator does that with the user's authorization and then updates JMS-164. Gate: `git status` is clean and `git log -1` shows the commit. Result: committed; `git status` clean, `git log -1` shows the commit.
