## 1. Shared rules

- [x] 1.1 In `CLAUDE.md`, add the "Post-merge cleanup" block after the standing orchestrator authorization in "Limits for every agent", and point the Git workflow "Delete the branch after merging" line at it — gate: python assert pointer line and anchor found once each in CLAUDE.md → ok
- [x] 1.2 Make the same changes word for word in `AGENTS.md`, and point its "Delete merged feature branches" Git workflow line at it — gate: same asserts on AGENTS.md → ok

## 2. Verify

- [x] 2.1 The "Post-merge cleanup" block is identical in `CLAUDE.md` and `AGENTS.md`, and nothing else in either file changed except the two pointer lines and the user-requested clarification that Codex/GPT and Claude have equal orchestrator authorization — gate: diff of the extracted Post-merge cleanup block CLAUDE.md vs AGENTS.md → identical (10 lines); git diff shows only the block, the two pointer lines, and the authorization clarification; independent-review fix: the mirrored cleanup block checks the root branch is develop before merging, and leaves other branches or detached HEAD unchanged; rerun: matching authorization and cleanup blocks asserted
- [x] 2.2 `openspec validate post-merge-cleanup --strict` passes — gate: openspec validate post-merge-cleanup --strict → valid
