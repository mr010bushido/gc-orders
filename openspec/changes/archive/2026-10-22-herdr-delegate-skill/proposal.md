## Why

Orchestrators now hand implementer and reviewer runs to Claude and Codex workers in Herdr panes. The `herdr-delegate` skill that drives this exists only in one user's personal skills folder, and an outdated copy at that. Other checkouts, and Codex orchestrators, either don't have it or dispatch differently. Workers launch on the default model, panes go unlabelled, reports are read from the screen, and finished panes stay open.

## What Changes

- Ship the updated `herdr-delegate` skill in the repository at `.agents/skills/herdr-delegate/`, which Codex reads, with `.claude/skills/herdr-delegate` as a symlink for Claude. Its dispatch steps:
  - label each worker pane at launch, with an agent name to match, and address workers by pane ID;
  - append the chosen model to the `cdm`/`cc` alias;
  - give each worker a fixed `handoff.md`/`result.md` directory, with the result requested in the first prompt;
  - put worktrees beside the project's existing ones;
  - allow several workers, running in parallel only when their tasks are independent;
  - close panes the dispatch created once each result has been read.
- The shared Skills section says the orchestrator may load `herdr` and `herdr-delegate`, and implementers may not.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-roles`: the skill allow-list adds the orchestrator's dispatch skills, and a new requirement says the dispatch skill ships with the repository.

## Impact

New files `.agents/skills/herdr-delegate/SKILL.md` and the `.claude/skills/herdr-delegate` symlink, plus the Skills section of `CLAUDE.md` and `AGENTS.md`. There are no application code or CI changes. The skill depends on the `herdr` skill and the user's `cdm`/`cc` shell aliases being installed. Without them, it reports a blocker.
