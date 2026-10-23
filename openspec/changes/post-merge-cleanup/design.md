## Context

The standing orchestrator authorization (JMS-192) covers push, PR, review and merge into `develop`. Cleanup after the merge is only partly written down. JMS-190's cleanup (archive PR #47) was the first run of the full sequence below.

## Decisions

- **Safety checks before deleting.** A worktree and its local branch are removed only when `git status --porcelain` is empty and HEAD is an ancestor of `origin/develop`. Otherwise they stay, and the report says why. Uncommitted work is never discarded.
- **The root checkout is fast-forwarded only on develop, never stashed.** First check its current branch; leave any other branch or detached HEAD unchanged and report why. `git fetch origin && git merge --ff-only origin/develop` works on a dirty tree and refuses rather than overwriting the user's edits (an earlier stash/pop conflicted on `next.config.ts`).
- **The archive goes through a PR.** Archiving edits `openspec/specs/`, so it uses its own `feature/jms-<n>-archive-<change>` branch and PR, under the same merge conditions. The orchestrator replaces the "TBD" Purpose the CLI generates.
- **CLI, not the skill.** `openspec archive <change> --yes` works unattended. The interactive `openspec-archive-change` skill stays denied to unattended agents.
- **Non-change PRs** (chores, archive PRs) run only the branch, worktree, root-checkout and temporary-artifact steps.

## Risks / Trade-offs

- [The orchestrator removes a worktree another session is using] → It removes only the merged change's own worktree, and only when it is clean and fully merged.
