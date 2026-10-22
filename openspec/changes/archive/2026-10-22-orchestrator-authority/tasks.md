## 1. Shared rules

- [x] 1.1 In `CLAUDE.md`, rewrite the Coordinator and "Review is independent" bullets, add the standing orchestrator authorization under "Limits for every agent", and change step 8 of "Implementing an OpenSpec change" so the orchestrator pushes and opens the PR — gate: grep confirms all four passages replaced once each (python assert count==1)
- [x] 1.2 Make the same changes word for word in `AGENTS.md`, and point its Git workflow authorization line at "Limits for every agent" — gate: same asserts on AGENTS.md, plus the Git workflow line
- [x] 1.3 In `.claude/agents/openspec-implementer.md`, change the final return so the orchestrator pushes and opens the PR — gate: assert count==1 on the return line

## 2. Verify

- [x] 2.1 Check that the changed passages are identical in `CLAUDE.md` and `AGENTS.md`, and that the Next.js generated block in `AGENTS.md` is unchanged — gate: diff of the Limits section CLAUDE.md vs AGENTS.md → identical; Coordinator, Review and step-8 lines identical; nextjs block diff vs origin/develop → unchanged
- [x] 2.2 `openspec validate orchestrator-authority --strict` passes — gate: openspec validate orchestrator-authority --strict → valid
