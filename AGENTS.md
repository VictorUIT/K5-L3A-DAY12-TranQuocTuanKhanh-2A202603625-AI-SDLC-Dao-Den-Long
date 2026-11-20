# AGENTS.md: harness for AI agents working on Đảo Đèn Lồng

## Stack
- Node >= 20, ES modules. 3D rendering: Three.js (`three@0.170.0`) via Vite (`vite@6.0.7`).
- `src/core/`: **pure game logic**. No DOM, no `three`, no `Math.random()`, no `Date.now()`/`performance.now()`.
  All randomness comes from `createRng(seed)` in `src/core/rng.js`. Time advances only via fixed-step `step()`.
- `src/headless/`: CLI implementing the **Test Contract**. Uses only `src/core/`.
- `src/web/`: rendering + input only. Reads state from core, never owns game rules.
- `tests/`: `node:test` tests. Run with `npm test`.

## Rules
1. The Test Contract (`docs/lab/PRD-0.md`, section "Test Contract v1.0") is the source of truth for headless I/O. Match formats exactly.
2. Never edit expected outputs to make a test pass. If a test is wrong because the requirements changed, fix it or delete it and record why in `docs/notes/`.
3. Determinism: same input + seed must give byte-identical headless output. Verify by running twice.
4. Ambiguity: do not silently guess. Pick a value, record it in `docs/notes/assumptions.md` (and in the contract declaration file if the contract requires one).
5. Before saying something is done: run `npm test` and the relevant headless scenario, and paste real output into `docs/proof/`.
6. Small, focused commits. Do not commit `node_modules/`, `dist/`, `.env` or secrets.
7. Keep changes scoped to the current phase ticket. Do not implement future features speculatively.

## Commands
- `npm install`: install deps
- `npm run dev`: play in browser (WASD)
- `npm run headless -- <args>`: headless run
- `npm test`: all tests
- `npm run build`: static web build into `dist/`
