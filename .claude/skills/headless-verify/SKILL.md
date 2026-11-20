---
name: headless-verify
description: Verify a gameplay change against the Test Contract (v1.1) using real headless runs before claiming it is done. Use after any change in src/core or src/headless.
---

# headless-verify

1. `npm test`: every test must pass. Never edit an expected value just to make it pass; if the rule changed, cite the ticket line in the commit.
2. Determinism: run the same command twice and compare hashes:
   `node src/headless/cli.js --seed 42 --night N --ticks 3000 --out a.jsonl` (twice → `sha256sum`).
3. For the feature you touched, write a tiny scenario (`random_*: false`, explicit entities) and read the JSONL events/snapshots yourself.
4. Performance: a 21,600-tick night must finish ≤ 30 s (`tests/phase2.test.js` "performance").
5. Paste the real command output into `docs/proof/phase-N/` and note any assumption in `docs/notes/assumptions.md`.
