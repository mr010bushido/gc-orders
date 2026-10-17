## Context

- Linear issues for this repo are created by hand and moved by hand. JMS-162 and JMS-163 both lagged until someone noticed.
- Linear's own GitHub integration can move statuses from branch and PR events, but nothing here configures it, and changing Linear or GitHub settings is outside what agents may do without authorization.

## Goals / Non-Goals

**Goals:**
- A written rule saying who updates Linear, when, and to which status.
- An agent that follows the rule reports what it did, so a missed update is visible.

**Non-Goals:**
- Automating status changes through webhooks or the Linear-GitHub integration.
- Changing the Linear workflow states themselves.

## Decisions

1. **Transitions follow the repo events a person can see.** In Progress on branch creation, In Review on PR open, Done when the archive PR merges. Closing on the feature PR merge was rejected: archive is part of the definition of done in git-flow, and a change that is merged but not archived is not finished.
2. **The coordinator makes the update, not the implementer.** The implementer contract already forbids touching platform settings and runs unattended with only the repository in scope. One writer per issue avoids two agents racing on the same status.
3. **Report, do not assume.** The final message names each issue and its new status. If the Linear tools are unavailable the message says so, and the issue is left for the user to move.
4. **A status that is already behind is fixed when noticed.** An agent that finds an issue in a stale state while working on that change moves it and reports it. It does not touch other changes' issues.

## Risks / Trade-offs

- [The rule is followed only by agents that read it] → It is in both docs and the spec, and the agent's final message is the audit trail.
- [A merged-but-unarchived change sits in In Review for a while] → Accepted. That is accurate, and archiving is one `/opsx:archive` away.
