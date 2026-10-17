## Why

JMS-162 stayed Todo long after its PR merged, so the Linear tracker fell behind the repo. `agent-roles` requires every OpenSpec change to have a Linear issue but says nothing about keeping that issue's status current, so nobody is responsible for it.

## What Changes

- Add a requirement to `agent-roles`: the coordinating agent keeps the change's Linear issue in step with the work. In Progress when the branch is created, In Review when the PR is opened, Done when the archive PR merges. A feature PR merging does not close the issue, because archiving is the change's last step.
- The coordinator reports each status update in its final message, and reports it honestly when Linear is unavailable instead of claiming it was updated.
- Implementers never touch Linear. Status updates are not "Linear settings", so they do not need separate authorization.
- Put the same rule in `CLAUDE.md` and `AGENTS.md`: in the shared "Implementing an OpenSpec change" section (kept word for word identical), and in the branch-cleanup rule in each file's git-flow text.

No automation, webhooks or GitHub-Linear integration changes.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `agent-roles`: adds the requirement that Linear status follows the change's branch, PR and archive.

## Impact

- Modified: `CLAUDE.md` and `AGENTS.md` (documentation only). No application code, dependencies, CI or repository settings change.
- Tracked as Linear issue JMS-164, branch `feature/jms-164-linear-status-sync`.
- Independent of `platform-portability` (JMS-165); both edit the two docs in different sections.
