## Why

After a feature PR merges, the cleanup is spread across separate rules: "Delete the branch after merging, then run `/opsx:archive`" in the Git workflow, and the Linear status rule. Nothing covers the change's worktree and local branch, the root checkout, or temporary artifacts such as harness routes, screenshots and dev servers. Orchestrators skip or improvise these steps, so stale worktrees and unarchived changes pile up. The user asked (2026-10-23) to make cleanup an explicit step of the orchestration workflow, the same for every orchestrator.

## What Changes

- Add a "Post-merge cleanup" requirement to `agent-roles`. Once a feature PR reports MERGED, the orchestrator, without asking:
  - deletes the remote branch;
  - removes the change's worktree and local branch, only when they are clean and merged;
  - fast-forwards the root checkout without touching the user's edits;
  - archives the change through an archive PR under the existing CI, review and merge conditions;
  - repeats the branch and worktree cleanup for the archive PR, then sets the Linear issue to Done;
  - removes temporary artifacts.
- Add the same text word for word to `CLAUDE.md` and `AGENTS.md` under "Limits for every agent", and point their Git workflow cleanup lines at it.
- Archiving uses the `openspec archive` CLI, so the `openspec-archive-change` skill stays denied to unattended agents.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-roles`: new requirement "Post-merge cleanup".

## Impact

`CLAUDE.md`, `AGENTS.md` and the `agent-roles` spec. No application code or CI changes.
