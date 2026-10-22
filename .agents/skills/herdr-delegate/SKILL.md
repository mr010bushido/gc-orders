---
name: herdr-delegate
description: Dispatch already-scoped tasks from a Claude or Codex orchestrator to Claude or Codex agents in Herdr panes, then collect their results. Use after the orchestrator has decided what to delegate.
---

# Herdr delegate

Use this skill as the dispatch step after the orchestrator has prepared one or more bounded, independent task descriptions. The orchestrator owns task selection, shared context, integration, and final decisions; this skill packages and runs the prepared work.

The orchestrator may start as many workers as the work needs, one per task. Run them in parallel when the tasks are independent and in sequence when one needs another's output. Each worker gets its own name, pane, and handoff/result directory. Tasks that edit code in parallel each get their own worktree and branch, so they never write to the same checkout.

## Dispatch

1. If the task descriptions or acceptance criteria are missing, ask the orchestrator to finish scoping them before dispatch.
2. Follow the installed `herdr` skill for session checks, pane creation, agent commands, and lifecycle handling. If that skill is unavailable, read its `SKILL.md` before controlling Herdr.
3. Require `HERDR_ENV=1` before any Herdr control command. If it is absent, stop and report that dispatch must be run from a Herdr-managed pane.
4. Give each task a unique name matching `[a-z][a-z0-9_-]{0,31}` (for example `cakes-impl`) and its own directory, `${TMPDIR:-/tmp}/herdr-delegate/<name>/`. Write the handoff to `handoff.md` there; the worker writes its report to `result.md` beside it. Follow the installed `handoff` skill's conventions: summarize only context the worker needs, reference existing artifacts instead of copying them, redact secrets, and include suggested skills when useful.
5. Reuse an idle agent only when it is suitable for that task and matches the requested provider. Default to Codex unless the orchestrator selects Claude. Otherwise create an available sibling pane in the current tab, preserve the current working directory, and keep user focus unchanged.
   - **Label the pane at once:** `herdr pane rename <pane-id> <name>`, before launching anything, so the user can find and address the worker in the UI.
   - **Launch with the alias and the model.** Launch Codex with the user's `cdm` alias or Claude with the user's `cc` alias in that pane's interactive shell: `herdr pane run <pane-id> "cdm"` or `herdr pane run <pane-id> "cc"`. These are shell aliases, not Herdr agent kinds; do not replace them with bare `codex` or `claude` commands. When the orchestrator or the project's instructions name a model, append it to the alias: `"cdm -m <model>"` or `"cc --model <model>"`. Never launch without it when one is named; the bare alias runs whatever the local config defaults to.
   - **Name the agent too.** Confirm Herdr recognizes the expected agent in that pane and it is ready, then `herdr agent rename <pane-id> <name>` with the same name. Herdr clears an agent name when it re-detects the occupant, so address the worker by pane ID; if `herdr agent get <name>` returns `agent_not_found`, set the name again.
   - If the alias is unavailable or startup fails, report the blocker.
   - Do not create a worktree or change workspace unless the orchestrator requested it. When it does, put the worktree where the project's existing worktrees live (`git worktree list`), not in a temporary directory: a worktree on another filesystem from the package store re-downloads every dependency.
6. Prompt each agent with its handoff path, task, acceptance criteria, and the instruction to write its final report (files changed, checks run with results, blockers) to its `result.md` and reply with only that path. Workers in the same checkout share files, so never run two of them in parallel when they edit the same files or one depends on another's unmerged changes. Give them separate worktrees, or run them one after another.
7. Wait for each agent to settle. With several workers, prompt them all first, then wait on each by pane ID; a running `--wait` on one must not hold back prompting the others. Inspect its state; report blocked agents or questions to the orchestrator instead of guessing. Read the result from `result.md`, not from the pane: full-screen agent UIs keep earlier output off the readable screen. If the file is missing, read the pane, then ask the agent to write the file.
8. Return each agent's status, the model it ran, result, changed paths, checks, pane ID and label, and handoff/result paths to the orchestrator.
9. Close each pane this dispatch created once its agent has settled as done or idle and its `result.md` has been read: `herdr pane close <pane-id>`, then confirm it is gone from `herdr pane list`. Keep the pane open if the agent is blocked, asked a question, or its result is missing or reports a blocker, and say so. Never close panes, tabs or workspaces you did not create, and leave the handoff and result files in place.

Use the pane output for live progress and the handoff/result files as durable context. Do not claim a task is complete until the agent has reported completion and its result has been inspected.
