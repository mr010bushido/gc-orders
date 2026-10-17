## ADDED Requirements

### Requirement: Implements one agreed change per run
The `openspec-implementer` SHALL implement exactly one named OpenSpec change per run, in an isolated git worktree on branch `feature/jms-<n>-<change>`, working the pending tasks in `tasks.md` in order. It SHALL read the context files listed by `openspec instructions apply --change <name> --json`. It SHALL NOT propose or archive a change, and SHALL NOT push, open a PR, merge, release or deploy.

#### Scenario: Started with a change name and branch
- **WHEN** the coordinator delegates the implementer with change `<name>` and a branch name carrying a Linear key
- **THEN** the agent works in a worktree on that branch and starts at the first pending task

#### Scenario: Started without a change name
- **WHEN** the agent is started with no change name
- **THEN** it makes no edits and returns asking for one

#### Scenario: No Linear key supplied
- **WHEN** the branch name carries no Linear key
- **THEN** the agent makes no edits and returns asking for the key, and does not invent one

#### Scenario: All tasks already done
- **WHEN** `openspec instructions apply` reports `all_done`
- **THEN** the agent makes no edits and returns "ready for PR"

### Requirement: Every ticked task carries a runnable gate
The agent SHALL tick a task (`- [ ]` to `- [x]`) only after running a gate and SHALL append the gate and its result to the task line. Gates are the repository commands that apply to the task: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `openspec validate <name> --strict` for artifact changes. A task with no runnable command SHALL name the check actually performed.

#### Scenario: Gate passes
- **WHEN** a task's change is made and its gate succeeds
- **THEN** the line is ticked and ends with the gate result, for example `— gate: pnpm test lib/pricing.test.ts → 24 passed`

#### Scenario: Gate fails outside the task's scope
- **WHEN** a gate keeps failing for a reason outside the task's scope
- **THEN** the task is not ticked and is handled as a blocker

#### Scenario: Pre-existing failure
- **WHEN** a gate fails on the base commit in the same way
- **THEN** the agent records that the failure is pre-existing and does not claim a pass

### Requirement: Deviations are recorded in place
When the agent does something other than what a task line says, it SHALL rewrite that line to state what was actually done and why, before ticking it.

#### Scenario: Plan turns out wrong
- **WHEN** implementing task 2.3 shows the planned file is the wrong place for the change
- **THEN** the 2.3 line is rewritten to name what was changed and why

### Requirement: Blockers are escalated, never guessed
When a task is ambiguous, reveals a design problem, needs an action the agent is forbidden to take, or has a gate it cannot make pass, the agent SHALL stop, prefix the task line with `BLOCKED: <one-line question>`, commit the work so far, and return without starting later tasks.

#### Scenario: Ambiguous task
- **WHEN** a task can reasonably be read two ways that lead to different code
- **THEN** the line becomes `- [ ] BLOCKED: <question> — <original text>`, the work so far is committed, and the agent returns

#### Scenario: Forbidden action needed
- **WHEN** a task requires a push, a deploy, or a platform setting change
- **THEN** the agent marks it BLOCKED and names the action for the coordinator

#### Scenario: Resumed after an answer
- **WHEN** the coordinator delegates again with the answer to a BLOCKED task
- **THEN** the agent removes the `BLOCKED:` prefix, records the answer on the task line and continues from that task

### Requirement: Structured return
On every exit the agent SHALL return the change name, branch, tasks ticked this run with their gates, any BLOCKED lines, and overall `N/M` progress.

#### Scenario: Run completes all tasks
- **WHEN** the last pending task is ticked
- **THEN** the return says `M/M`, lists the gates, and recommends opening a PR into `develop`, which stays with the user

### Requirement: Unattended-run safety
The agent SHALL NOT use interactive prompts, and SHALL NOT read production secrets. It SHALL commit only to its own branch.

#### Scenario: Question during a background run
- **WHEN** the agent needs a decision
- **THEN** it follows the BLOCKED protocol and does not wait for an answer
