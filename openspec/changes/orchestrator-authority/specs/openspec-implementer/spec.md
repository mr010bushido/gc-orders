## MODIFIED Requirements

### Requirement: Structured return
On every exit the agent SHALL return the change name, branch, tasks ticked this run with their gates, any BLOCKED lines, and overall `N/M` progress.

#### Scenario: Run completes all tasks
- **WHEN** the last pending task is ticked
- **THEN** the return says `M/M`, lists the gates, and recommends opening a PR into `develop`, which the orchestrator pushes and opens
