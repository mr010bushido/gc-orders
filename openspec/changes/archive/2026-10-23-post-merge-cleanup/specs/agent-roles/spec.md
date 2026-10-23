## ADDED Requirements

### Requirement: Post-merge cleanup
After a feature PR reports MERGED, the orchestrating agent SHALL clean up without asking, in this order:
1. Delete the remote branch.
2. Remove the change's worktree and local branch, but only when the worktree has no uncommitted changes and its HEAD is in `origin/develop`.
3. Fast-forward the root checkout only when its current branch is `develop`, without stashing, committing or reverting the user's uncommitted edits. Leave any other branch or detached HEAD unchanged and report why.
4. Archive the change through a `feature/jms-<n>-archive-<change>` PR, using the `openspec archive` CLI and replacing the generated Purpose placeholder, under the standing authorization's CI, review and merge conditions.
5. After the archive PR reports MERGED, apply steps 1 to 3 to the archive branch and set the Linear issue to Done.
6. Remove temporary artifacts it created for the change: harness routes, screenshots, scratch files and dev servers.

A merged PR that is not an OpenSpec change SHALL get steps 1, 2, 3 and 6 only. The final report SHALL state the result of each step.

#### Scenario: Clean merged worktree
- **WHEN** a feature PR reports MERGED and its worktree is clean with HEAD in `origin/develop` and the root checkout is on `develop`
- **THEN** the orchestrator deletes the remote branch, removes the worktree and local branch, fast-forwards `develop` and opens the archive PR

#### Scenario: Worktree has uncommitted work
- **WHEN** the change's worktree has uncommitted changes or commits that are not in `origin/develop`
- **THEN** the orchestrator leaves the worktree and branch in place and reports why

#### Scenario: Root checkout cannot fast-forward
- **WHEN** the fast-forward of the root checkout refuses because it would overwrite the user's edits
- **THEN** the orchestrator leaves the checkout unchanged and reports it

#### Scenario: Archive PR merged
- **WHEN** the archive PR reports MERGED
- **THEN** the orchestrator removes the archive branch and worktree and sets the change's Linear issue to Done

#### Scenario: Root checkout is not on develop
- **WHEN** the root checkout is on another branch or has a detached HEAD
- **THEN** the orchestrator leaves it unchanged and reports why
