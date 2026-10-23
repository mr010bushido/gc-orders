## 1. Shared rules

- [ ] 1.1 In `CLAUDE.md`, add the "Post-merge cleanup" block after the standing orchestrator authorization in "Limits for every agent", and point the Git workflow "Delete the branch after merging" line at it
- [ ] 1.2 Make the same changes word for word in `AGENTS.md`, and point its "Delete merged feature branches" Git workflow line at it

## 2. Verify

- [ ] 2.1 The "Post-merge cleanup" block is identical in `CLAUDE.md` and `AGENTS.md`, and nothing else in either file changed except the two pointer lines
- [ ] 2.2 `openspec validate post-merge-cleanup --strict` passes
