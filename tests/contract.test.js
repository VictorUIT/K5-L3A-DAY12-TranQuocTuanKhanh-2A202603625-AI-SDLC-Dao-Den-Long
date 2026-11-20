// Phase 1 regression (Test Contract v1.0 rules) re-run with TICKET-02 standard numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUNING as T } from '../src/core/tuning.js';
import { run, quiet, near } from './helpers.js';

// UPDATED Phase 3: contract v1.2 (TICKET-03 §7) — version, durations 240/270/300 and new fuel keys.
test('game.contract.json v1.2 mirrors the standard numbers', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.2');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof c[k], 'string');
  assert.deepEqual(c.tuning, T);
  assert.equal(T.player_speed, 6); assert.equal(T.carry_capacity, 10); assert.equal(T.lantern_cost, 10);
  assert.equal(T.dash_speed, 14); assert.equal(T.night3_duration_s, 300); assert.equal(T.night1_duration_s, 240);
  for (const [k, v] of Object.entries({ fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20 })) assert.equal(T[k], v, k);
});

test('determinism on every night (incl. generated ids)', () => {
  const inputs = { frames: [{ tick: 0, move: [0.6, 0.8] }, { tick: 300, move: [-1, 0], pulse: true, dash: true }, { tick: 301, pulse: false, dash: false }] };
  for (const night of [1, 2, 3]) {
    const a = run({ seed: 42, night, ticks: 3000, inputs }), b = run({ seed: 42, night, ticks: 3000, inputs });
    assert.equal(a.status, 0);
    assert.equal(a.text, b.text, `night ${night}`);
  }
});

test('tick model: snapshot 0 before input, night_start at tick 1, N steps, cadence, end last', () => {
  const r = run({ ticks: 25, every: 10, scenario: quiet(), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  assert.equal(r.lines[0].type, 'snapshot');
  assert.deepEqual(r.lines[1], { type: 'event', tick: 1, name: 'night_start', data: { night: 1 } });
  assert.deepEqual(r.snaps.map((s) => s.tick), [0, 10, 20]);
  assert.deepEqual(r.snaps[0].player.pos, [0, 0, 0]);
  assert.deepEqual(r.end, { type: 'end', ticks: 25, state: 'playing', score: 0 });
  // UPDATED Phase 3: Night 1 is 240 s (TICKET-03 §3).
  assert.equal(r.snaps[1].time_left_s, Math.round((240 - 10 / 60) * 1000) / 1000);
  assert.equal(r.snaps[1].sim_tick, 10);
});

test('movement: 6 m/s, yaw rotation formula, normalisation, no inputs = stand still', () => {
  const at = (frames) => run({ ticks: 60, every: 60, scenario: quiet(), inputs: { frames } }).snaps.at(-1).player.pos;
  assert.deepEqual(at([{ tick: 0, move: [0, 1] }]), [0, 0, 6]);
  assert.deepEqual(at([{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }]), [6, 0, 0]);
  const d = at([{ tick: 0, move: [1, 1] }]);
  assert.ok(near(Math.hypot(d[0], d[2]), 6, 0.01));
  assert.deepEqual(run({ ticks: 60, every: 60, scenario: quiet() }).snaps.at(-1).player.pos, [0, 0, 0]);
});

test('jump 7 m/s with gravity 20: airborne ~42 ticks then lands', () => {
  const r = run({ ticks: 60, every: 1, scenario: quiet(), inputs: { frames: [{ tick: 0, jump: true }] } });
  const ys = r.snaps.map((s) => s.player.pos[1]);
  assert.ok(near(Math.max(...ys), 49 / 40, 0.1)); // v^2/2g = 1.225 m
  assert.equal(r.snaps[30].player.grounded, false);
  assert.equal(r.snaps[45].player.grounded, true);
  assert.equal(r.snaps[45].player.pos[1], 0);
});

test('pickup: XZ <= 1.0, capacity 10, pickup itself scores 0', () => {
  const r = run({ ticks: 1, every: 1, scenario: quiet({ motes: [[1, 0, 0], [0, 0, 1.5]] }) });
  assert.deepEqual(r.game, [{ type: 'event', tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
  assert.equal(r.end.score, 0);
  assert.equal(r.snaps.at(-1).motes_active, 1);
  assert.equal(run({ ticks: 1, scenario: quiet({ player: { carried: 10 }, motes: [[0, 0, 0]] }) }).game.length, 0);
});

// UPDATED Phase 3: +5 per deposited mote (TICKET-03 §5, was +10).
test('deposit min(carried, missing); +5 per deposited mote, +100 first light; pre-lit gives nothing', () => {
  const sc = quiet({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 2], deposited: 8 }] });
  const r = run({ ticks: 10, every: 10, scenario: sc, inputs: { frames: [{ tick: 3, interact: true }] } });
  assert.deepEqual(r.game.map((e) => [e.tick, e.name, e.data]), [
    [4, 'deposit', { lantern_id: 'L1', amount: 2, deposited: 10 }],
    [4, 'lantern_lit', { lantern_id: 'L1', relight: false }],
  ]);
  assert.equal(r.end.score, 2 * 5 + 100);
  assert.equal(r.snaps.at(-1).player.carried, 8);
  const pre = run({ ticks: 5, scenario: quiet({ lanterns: [{ id: 'L2', lit: true }] }) });
  assert.equal(pre.game.length, 0);
  assert.equal(pre.end.score, 0);
});

test('interact tie-break: equal distance -> smaller id', () => {
  const sc = quiet({ player: { carried: 1 }, lanterns: [{ id: 'L3', pos: [0, 0, 2] }, { id: 'L2', pos: [0, 0, -2] }] });
  const r = run({ ticks: 1, scenario: sc, inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.equal(r.ev('deposit')[0].data.lantern_id, 'L2');
});

// REPLACED Phase 3: "win as soon as all lanterns are lit" (all_lit) no longer exists (TICKET-03 §3).
// New rule: survive until dawn with >= ceil(0.6 * n) lanterns lit -> won/dawn_survived. See tests/phase3.test.js.
test('no early win: lighting every lantern does not end the night', () => {
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })).concat([{ id: 'L5', pos: [0, 0, 1], deposited: 0 }]);
  const r = run({ ticks: 600, scenario: quiet({ player: { carried: 10 }, lanterns }), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.equal(r.ev('lantern_lit').length, 1);
  assert.equal(r.ev('game_over').length, 0);
  assert.deepEqual(r.end, { type: 'end', ticks: 600, state: 'playing', score: 10 * 5 + 100 });
});

// UPDATED Phase 3: at dawn the lit count decides (TICKET-03 §3); reason is dawn_survived when won.
test('dawn: lost/dawn below threshold; lighting on the last tick reaches the threshold -> won', () => {
  const r = run({ ticks: 1000, scenario: quiet({ time_left_s: 2 }) });
  assert.deepEqual(r.ev('game_over')[0], { type: 'event', tick: 120, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
  assert.equal(r.end.ticks, 120);
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })).concat([{ id: 'L5', pos: [0, 0, 1] }]);
  const w = run({ ticks: 100, scenario: quiet({ time_left_s: 1, player: { carried: 10 }, lanterns }), inputs: { frames: [{ tick: 59, interact: true }] } });
  assert.deepEqual(w.ev('game_over')[0].data, { result: 'won', reason: 'dawn_survived' });
  assert.equal(w.ev('game_over')[0].tick, 60);
});

test('shade hit: -1 flame, floor(carried/2) dropped into 1.5-2.5 m ring (ttl 8 s), invuln 90, recoil', () => {
  const r = run({ ticks: 2, every: 1, scenario: quiet({ player: { carried: 5, flames: 2 }, shades: [{ id: 'X', pos: [0, 1, 0] }] }) });
  assert.deepEqual(r.ev('player_hit')[0], { type: 'event', tick: 1, name: 'player_hit', data: { by: 'shade', flames: 1, dropped: 2 } });
  const s1 = r.snaps[1];
  assert.equal(s1.player.carried, 3);
  assert.equal(s1.player.invuln, true);
  assert.equal(s1.shades[0].state, 'recoil');
  const dropped = s1.motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  for (const m of dropped) { const d = Math.hypot(m.pos[0], m.pos[2]); assert.ok(d >= 1.5 - 1e-3 && d <= 2.5 + 1e-3); assert.equal(m.ttl_s, 8); }
  const dead = run({ ticks: 10, scenario: quiet({ player: { flames: 1 }, shades: [{ pos: [0, 1, 0] }] }) });
  assert.deepEqual(dead.ev('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('at most one flame lost per tick; ascending id decides', () => {
  const r = run({ ticks: 1, scenario: quiet({ shades: [{ id: 'S2', pos: [0, 1, 0.5] }, { id: 'S1', pos: [0.5, 1, 0] }] }) });
  assert.equal(r.ev('player_hit').length, 1);
  assert.equal(r.end.score, 0);
});

test('pulse: 3 motes, 3D radius 5 from feet+0.8, stun 120, push 4 m over 15 ticks, +5 each, cooldown 3 s', () => {
  const sc = quiet({ player: { carried: 6 }, shades: [{ id: 'A', pos: [4.9, 1, 0] }, { id: 'B', pos: [0, 1, 5.5] }] });
  const frames = [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, pulse: true }, { tick: 3, pulse: false }];
  const r = run({ ticks: 125, every: 1, scenario: sc, inputs: { frames } });
  assert.equal(r.ev('pulse').length, 1, 'second press blocked by cooldown');
  assert.deepEqual(r.ev('pulse')[0].data, { stunned_ids: ['A'] });
  assert.equal(r.snaps[1].player.carried, 3);
  assert.equal(r.snaps[1].player.pulse_cd_s, 3);
  assert.ok(near(r.snaps[16].shades[0].pos[0], 8.9));
  assert.equal(r.snaps[120].shades[0].state, 'stunned');
  assert.notEqual(r.snaps[121].shades[0].state, 'stunned');
  assert.equal(r.end.score, 5);
  const poor = run({ ticks: 2, scenario: quiet({ player: { carried: 2 }, shades: [{ pos: [1, 1, 0] }] }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.equal(poor.ev('pulse').length, 0);
});

test('safe zone: shades blocked at 6 m of a lit lantern; shades inside when lit are evicted within 30 ticks, no damage', () => {
  const r = run({ ticks: 600, every: 10, scenario: quiet({ player: { pos: [0, 0, 20] }, lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true }], shades: [{ id: 'S', pos: [0, 1, 10] }] }) });
  for (const s of r.snaps) assert.ok(Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2] - 20) >= 6 - 1e-3);
  assert.equal(r.ev('player_hit').length, 0);
  const ev = run({ ticks: 200, every: 1, scenario: quiet({ player: { carried: 1 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], deposited: 9 }], shades: [{ id: 'S', pos: [1.2, 1, 0] }] }), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.equal(ev.ev('lantern_lit').length, 1);
  assert.ok(Math.hypot(ev.snaps[31].shades[0].pos[0], ev.snaps[31].shades[0].pos[2] - 1) >= 6 - 1e-3);
  assert.equal(ev.ev('player_hit').length, 0);
});

test('errors: malformed files exit 2, bad args non-zero with stderr', () => {
  assert.equal(run({ inputs: '{not json' }).status, 2);
  assert.equal(run({ inputs: { frames: [{ tick: 5 }, { tick: 5 }] } }).status, 2);
  assert.equal(run({ inputs: { frames: [{ tick: 0, move: [2, 0] }] } }).status, 2);
  assert.equal(run({ scenario: { motes: 'x' } }).status, 2);
  assert.equal(run({ scenario: { shades: [{ pos: [0, 0, 0], state: 'angry' }] } }).status, 2);
  const bad = run({ night: 4 });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /error/);
});
