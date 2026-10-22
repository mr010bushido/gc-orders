## Context

The merge rules came from two grants. On 2026-10-18 the user, while away, allowed unattended review and merge into `develop` under conditions. On 2026-10-22 the user added pushing feature branches and opening PRs, and confirmed that the whole set is a standing rule for any orchestrator. The repository's shared rules and the agent-roles spec still say these actions belong to the user.

## Goals / Non-Goals

**Goals:**
- One authorization text, word for word the same in `CLAUDE.md` and `AGENTS.md`, that any orchestrator follows.
- Merge conditions that can be checked mechanically: exact head SHA, CI state, review verdict, round count, base branch.

**Non-Goals:**
- Review automation (`pr-review-workflow`).
- GitHub branch protection or any other platform setting change.
- Releases, tags or deploys by agents.

## Decisions

- **The authorization belongs to the role, not to a provider.** The text says "the orchestrator" so a Codex-led session gets the same rights and limits. The alternative was a Claude memory note plus a Codex-specific note, which drift apart.
- **The authorization goes under "Limits for every agent".** That section already says "unless the user explicitly authorizes that specific action", so the standing grant sits beside the limits it relaxes. A separate section would be easy to read without its conditions.
- **The merge is pinned to the reviewed commit** with `gh pr merge --match-head-commit <sha>`, so a push after review can't merge unreviewed code.
- **After three rounds the orchestrator stops** and hands the PR to the user rather than looping.

## Risks / Trade-offs

- [The orchestrator merges a change the user would have questioned] → Independent review of the exact SHA, green CI, and `develop` only. `main` still needs a user-run release.
- [The two files drift] → The "CLAUDE.md and AGENTS.md agree" requirement; the tasks diff the changed passages.
- [The user's uncommitted local edits to `AGENTS.md` and the implementer contract] → This change touches different hunks; it does not carry those edits.
