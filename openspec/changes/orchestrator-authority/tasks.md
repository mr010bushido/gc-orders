## 1. Shared rules

- [ ] 1.1 In `CLAUDE.md`, rewrite the Coordinator and "Review is independent" bullets, add the standing orchestrator authorization under "Limits for every agent", and change step 8 of "Implementing an OpenSpec change" so the orchestrator pushes and opens the PR
- [ ] 1.2 Make the same changes word for word in `AGENTS.md`, and point its Git workflow authorization line at "Limits for every agent"
- [ ] 1.3 In `.claude/agents/openspec-implementer.md`, change the final return so the orchestrator pushes and opens the PR

## 2. Verify

- [ ] 2.1 Check that the changed passages are identical in `CLAUDE.md` and `AGENTS.md`, and that the Next.js generated block in `AGENTS.md` is unchanged
- [ ] 2.2 `openspec validate orchestrator-authority --strict` passes
