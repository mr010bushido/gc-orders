## Why

The user has granted the orchestrator standing authority to push feature branches, open PRs into `develop`, arrange review and merge under set conditions. That rule lives only in the Claude coordinator's private memory, so a Codex orchestrator never sees it. It also contradicts the agent-roles spec ("the PR is still merged only by the user") and the shared text in `CLAUDE.md` and `AGENTS.md` ("Pushing, opening PRs and merging stay with the user"). The workflow has to read the same no matter which agent orchestrates.

## What Changes

- The coordinator is defined as whichever agent orchestrates (Claude in T3 by default, or Claude or Codex from the CLI), not as Claude specifically.
- A standing orchestrator authorization is added to "Limits for every agent":
  - push `feature/*` branches and open their PRs, archive PRs included, into `develop`;
  - wait for CI, then delegate an independent review of the exact head SHA;
  - merge into `develop` only when every merge condition holds.
- The "review never authorizes merging" scenario is replaced: a review authorizes a merge only together with the other conditions.
- The implementer's final return recommends a PR that the orchestrator opens, instead of the user.
- Implementers still never push, open PRs or merge. Releases, tags, anything touching `main`, deploys, platform settings, the "allow secret" bypass and production secrets stay with the user.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-roles`: the limits requirement gains the standing orchestrator authorization and its merge conditions; a new requirement defines the orchestrator's PR flow.
- `openspec-implementer`: the "Run completes all tasks" scenario says the orchestrator opens the PR.

## Impact

`CLAUDE.md`, `AGENTS.md` (the shared roster, limits and implementer sections), `.claude/agents/openspec-implementer.md`, and the two specs. There are no application code or CI changes. The Claude coordinator's memory note is cut down to Claude-only details once this merges.
