# AGENTS.md: harness for AI agents working on Đảo Đèn Lồng

## Stack
- Node >= 20, ES modules. 3D rendering: Three.js (`three@0.170.0`) via Vite (`vite@6.0.7`).
- `src/core/`: **pure game logic**. No DOM, no `three`, no `Math.random()`, no `Date.now()`/`performance.now()`.
  All randomness comes from `createRng(seed)` in `src/core/rng.js`. Time advances only via fixed-step `step()`.
- `src/headless/`: CLI implementing the **Test Contract**. Uses only `src/core/`.
- `src/web/`: rendering + input only. Reads state from core, never owns game rules.
- `tests/`: `node:test` tests. Run with `npm test`.

## Rules
1. Source of truth: Test Contract **v1.3** = `docs/lab/PRD-0.md` (v1.0) + `docs/lab/TICKET-02.md` Part 4 (v1.1) + `docs/lab/TICKET-03.md` §7 (v1.2) + `docs/lab/TICKET-04.md` (v1.3: bench/soak). Later tickets override earlier rules (`[THAY THẾ]`). Match formats exactly.
   - Change requests: write an ADR in `docs/adr/`, list breaking changes in `CHANGELOG.md`, and mark every changed old test with `UPDATED Phase N` / `REPLACED Phase N` + the reason. Never `skip` a test.
   - Lantern fuel is integer 1/60 units (like timers); round only on output.
   - Numbers live in `src/core/tuning.js` (`TUNING` mirrors `game.contract.json`, `C` = other standard constants), maps in `src/core/maps.js`.
   - `step()` in `src/core/world.js` MUST follow the mandated per-tick order (TICKET-02 "Thứ tự xử lý trong một tick"); keep the numbered comments in sync.
   - Timers are integer tick counters, never float seconds.
   - Web-only extras (sound, effects, creative additions) must not change headless output.
2. Never edit expected outputs to make a test pass. If a test is wrong because the requirements changed, fix it or delete it and record why in `docs/notes/`.
3. Determinism: same input + seed must give byte-identical headless output. Verify by running twice.
4. Ambiguity: do not silently guess. Pick a value, record it in `docs/notes/assumptions.md` (and in the contract declaration file if the contract requires one).
5. Before saying something is done: follow the `headless-verify` skill (`.claude/skills/headless-verify/SKILL.md`): `npm test`, a targeted headless scenario, real output into `docs/proof/`.
6. Small, focused commits. Do not commit `node_modules/`, `dist/`, `.env` or secrets.
7. Keep changes scoped to the current phase ticket. Do not implement future features speculatively.
8. Every new feature needs at least one headless scenario test (`tests/phase2.test.js` style) and an acceptance criterion in `docs/spec/`.

## Commands
- `npm start`: play (`scripts/play.mjs`, on-disk leaderboard) · `npm run bench` / `npm run soak`: TICKET-04 measurements (commit the JSON)
- Bench scene and creative extras: bench mode lives in `createWorld({ bench: true })`; never add web-only extras to the bench scene.
- `npm install`: install deps
- `npm run dev`: play in browser
- `npm run headless -- <args>`: headless run
- `npm test`: all tests
- `npm run build`: static web build into `dist/`
