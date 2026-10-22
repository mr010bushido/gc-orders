## 1. Ship the skill

- [x] 1.1 Add `.agents/skills/herdr-delegate/SKILL.md` with the updated dispatch steps, and `.claude/skills/herdr-delegate` as a relative symlink to it — gate: cmp of .claude/skills/herdr-delegate/SKILL.md (through the symlink) vs the staged update → identical
- [x] 1.2 Add the orchestrator's dispatch skills to the Skills section of `CLAUDE.md` and `AGENTS.md`, word for word in both — gate: python assert count==1 in both files

## 2. Verify

- [x] 2.1 The symlink resolves to the same file; the Skills sections are identical; the Next.js generated block in `AGENTS.md` is unchanged — gate: readlink -f of both paths → same file; diff of Skills sections CLAUDE.md vs AGENTS.md → identical; nextjs block diff vs origin/develop → unchanged
- [x] 2.2 `openspec validate herdr-delegate-skill --strict` passes — gate: openspec validate herdr-delegate-skill --strict → valid
