## ADDED Requirements

### Requirement: Linear status follows the change
The coordinating agent SHALL keep the change's own Linear issue in step with the work: In Progress when the implementation branch is created, In Review when the PR is opened, and Done when the PR that archives the change merges. A feature PR merging SHALL NOT by itself move the issue to Done. The coordinator SHALL report each status update in its final message. Implementers SHALL NOT update Linear. Updating an issue's status is not a Linear settings change.

#### Scenario: Branch created
- **WHEN** the implementation branch for a tracked change is created
- **THEN** the coordinator moves its Linear issue to In Progress and reports it

#### Scenario: PR opened
- **WHEN** the PR for the change is opened
- **THEN** the coordinator moves the issue to In Review and reports it

#### Scenario: Feature PR merged, change not archived
- **WHEN** the feature PR has merged but the change is not yet archived
- **THEN** the issue stays In Review

#### Scenario: Archive PR merged
- **WHEN** the PR that archives the change has merged
- **THEN** the coordinator moves the issue to Done and reports it

#### Scenario: Linear unavailable
- **WHEN** the Linear tools cannot be reached
- **THEN** the coordinator says in its final message that the status was not updated, and does not claim it was

#### Scenario: Stale issue found
- **WHEN** an agent working on a change finds that change's issue in a status that is behind the repository
- **THEN** it moves that issue to the correct status and reports it, and does not touch any other change's issue

#### Scenario: Implementer and Linear
- **WHEN** an implementer finishes a task
- **THEN** it does not change any Linear issue and leaves the status update to the coordinator
