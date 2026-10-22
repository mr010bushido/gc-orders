## MODIFIED Requirements

### Requirement: Skill allow-list and deny-list
Every unattended agent SHALL be denied the `deploy-to-vercel` skill, the `gsd-*` skills, `openspec-propose` and `openspec-archive-change`. Implementers MAY load the `openspec-*` implementation skills, and the skills that match their ownership: `impeccable`, `web-design-guidelines`, `webapp-testing`, `vercel-react-best-practices` and `vercel-composition-patterns` for frontend work; `security-review`, `api-security-review` and `secrets-scan` for backend work. The orchestrator MAY load `herdr` and `herdr-delegate` to dispatch implementer and reviewer workers in Herdr panes; implementers SHALL NOT load them.

#### Scenario: Agent wants to deploy
- **WHEN** an implementer believes a change needs a deployment to be verified
- **THEN** it does not load a deploy skill and instead reports that the check needs the coordinator

#### Scenario: Backend agent loads a design skill
- **WHEN** a backend task has no UI work
- **THEN** the agent does not load the frontend design skills

#### Scenario: Implementer wants to dispatch another agent
- **WHEN** an implementer considers handing part of its task to another agent
- **THEN** it does not load `herdr-delegate` and reports the need to the orchestrator instead

## ADDED Requirements

### Requirement: Dispatch skill ships with the repository
The `herdr-delegate` skill SHALL live in the repository at `.agents/skills/herdr-delegate/SKILL.md`, with `.claude/skills/herdr-delegate` as a relative symlink to that directory, so Claude and Codex orchestrators in any checkout read the same text.

#### Scenario: Fresh worktree
- **WHEN** an orchestrator starts in a new worktree of the repository
- **THEN** `.agents/skills/herdr-delegate/SKILL.md` is present and `.claude/skills/herdr-delegate/SKILL.md` resolves to the same file
