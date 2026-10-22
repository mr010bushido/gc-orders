## Context

Claude reads project skills from `.claude/skills/`. Codex reads them from `.agents/skills/`. On the user's machine, `~/.claude/skills/herdr-delegate` is already a symlink into `~/.agents/skills/`, and both CLIs pick that up. The updated text was drafted and used for real dispatches on 2026-10-22: PRs #42 and #43 were reviewed by Codex workers in labelled panes.

## Goals / Non-Goals

**Goals:** one copy of the dispatch skill, versioned with the repository and read by both orchestrators.

**Non-Goals:** shipping the general `herdr` skill (it's a third-party tool skill installed per user); changing the implementer contract; adding the shell aliases.

## Decisions

- **One real file plus a symlink**, not two copies, so the Claude and Codex versions can't drift. A relative symlink (`../../.agents/skills/herdr-delegate`) works in every checkout and worktree on Linux and macOS.
- **The orchestrator loads it; implementers don't.** Implementers never dispatch other agents. Listing the skill under the orchestrator keeps the implementer allow-list unchanged.

## Risks / Trade-offs

- [A personal copy of the same skill shadows or duplicates the project copy] → The user installs the same text personally, or removes the personal copy.
- [The skill names user-specific aliases (`cdm`, `cc`)] → The skill already says to report a blocker when an alias is missing.
