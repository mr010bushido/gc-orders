## 1. Ship the skill

- [ ] 1.1 Add `.agents/skills/herdr-delegate/SKILL.md` with the updated dispatch steps, and `.claude/skills/herdr-delegate` as a relative symlink to it
- [ ] 1.2 Add the orchestrator's dispatch skills to the Skills section of `CLAUDE.md` and `AGENTS.md`, word for word in both

## 2. Verify

- [ ] 2.1 The symlink resolves to the same file; the Skills sections are identical; the Next.js generated block in `AGENTS.md` is unchanged
- [ ] 2.2 `openspec validate herdr-delegate-skill --strict` passes
