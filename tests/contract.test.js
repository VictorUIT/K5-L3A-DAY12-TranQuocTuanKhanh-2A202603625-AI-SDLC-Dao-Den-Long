import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TUNING } from '../src/core/tuning.js';

const T = TUNING;
const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
let n = 0;
function run({ seed = 1, ticks = 60, scenario, inputs, every = 10, raw = [] } = {}) {
  const out = join(dir, `o${++n}.jsonl`);
  const args = ['src/headless/cli.js', '--seed', String(seed), '--night', '1', '--ticks', String(ticks), '--out', out, '--snapshot-every', String(every), ...raw];
  if (scenario !== undefined) { const f = join(dir, `s${n}.json`); writeFileSync(f, typeof scenario === 'string' ? scenario : JSON.stringify(scenario)); args.push('--scenario', f); }
  if (inputs !== undefined) { const f = join(dir, `i${n}.json`); writeFileSync(f, typeof inputs === 'string' ? inputs : JSON.stringify(inputs)); args.push('--inputs', f); }
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (r.status !== 0) return { status: r.status, stderr: r.stderr };
  const text = readFileSync(out, 'utf8');
  const lines = text.trim().split('\n').map((l) => JSON.parse(l));
  return { status: 0, text, lines, snaps: lines.filter((l) => l.type === 'snapshot'), events: lines.filter((l) => l.type === 'event'), end: lines.at(-1) };
}
const quiet = (extra = {}) => ({ random_motes: false, random_shades: false, motes: [], shades: [], ...extra });

test('game.contract.json tuning mirrors the numbers the game uses', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.0');
  for (const k of ['team', 'build_cmd', 'run_cmd', 'headless_cmd']) assert.equal(typeof c[k], 'string');
  assert.deepEqual(c.tuning, T);
});

test('determinism: same seed/scenario/inputs give identical output, including generated ids', () => {
  const inputs = { frames: [{ tick: 0, move: [0.6, 0.8] }, { tick: 300, move: [-1, 0], pulse: true }, { tick: 301, pulse: false }] };
  const a = run({ seed: 42, ticks: 3000, inputs }), b = run({ seed: 42, ticks: 3000, inputs });
  assert.equal(a.text, b.text);
  assert.ok(a.events.some((e) => e.name === 'shade_spawned'));
});

test('tick model: snapshot 0 before input, N steps, snapshot cadence, end line last', () => {
  const r = run({ ticks: 25, every: 10, scenario: quiet(), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  assert.deepEqual(r.snaps.map((s) => s.tick), [0, 10, 20]);
  assert.deepEqual(r.snaps[0].player.pos, [0, 0, 0]);
  assert.deepEqual(r.end, { type: 'end', ticks: 25, state: 'playing', score: 0 });
  assert.equal(r.snaps[1].time_left_s, Math.round((T.night1_duration_s - 10 / 60) * 1000) / 1000);
  assert.equal(r.snaps[1].sim_tick, 10);
});

test('movement: speed, yaw rotation formula, normalisation', () => {
  const at = (frames, ticks = 60) => run({ ticks, every: ticks, scenario: quiet(), inputs: { frames } }).snaps.at(-1).player.pos;
  assert.deepEqual(at([{ tick: 0, move: [0, 1] }]), [0, 0, T.player_speed]);
  // yaw 90: x' = x cos + z sin -> move [0,1] goes +X
  assert.deepEqual(at([{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }]), [T.player_speed, 0, 0]);
  const d = at([{ tick: 0, move: [1, 1] }]);
  assert.ok(Math.abs(Math.hypot(d[0], d[2]) - T.player_speed) < 0.01);
  // absent fields persist; no inputs file = stand still
  assert.deepEqual(run({ ticks: 60, every: 60, scenario: quiet() }).snaps.at(-1).player.pos, [0, 0, 0]);
});

test('jump raises y then lands; does not move XZ', () => {
  const r = run({ ticks: 120, every: 10, scenario: quiet(), inputs: { frames: [{ tick: 0, jump: true }] } });
  assert.ok(r.snaps[2].player.pos[1] > 0);
  assert.deepEqual(r.snaps.at(-1).player.pos, [0, 0, 0]);
});

test('pickup: within radius (<=), respects capacity, scores per_mote', () => {
  const motes = [[T.pickup_radius, 0, 0], [0, 0, T.pickup_radius + 0.5]];
  const r = run({ ticks: 1, every: 1, scenario: quiet({ motes }) });
  assert.deepEqual(r.events, [{ type: 'event', tick: 1, name: 'mote_picked', data: { carried: 1 } }]);
  assert.equal(r.end.score, T.score.per_mote);
  assert.equal(r.snaps.at(-1).motes_active, 1);
  const full = run({ ticks: 1, every: 1, scenario: quiet({ player: { carried: T.carry_capacity }, motes: [[0, 0, 0]] }) });
  assert.equal(full.events.length, 0);
});

test('deposit + light lantern on interact edge; pre-lit setup gives no points', () => {
  const sc = quiet({ player: { pos: [0, 0, 0], carried: T.carry_capacity }, lanterns: [{ id: 'L1', pos: [0, 0, T.interact_radius], deposited: T.lantern_cost - 2 }] });
  const r = run({ ticks: 10, every: 10, scenario: sc, inputs: { frames: [{ tick: 3, interact: true }] } });
  assert.deepEqual(r.events.map((e) => [e.tick, e.name, e.data]), [
    [4, 'deposit', { lantern_id: 'L1', amount: 2, deposited: T.lantern_cost }],
    [4, 'lantern_lit', { lantern_id: 'L1' }],
  ]);
  assert.equal(r.end.score, T.score.per_lantern);
  assert.equal(r.snaps.at(-1).player.carried, T.carry_capacity - 2);
  // holding interact does not re-trigger; setup lit:true emits nothing
  const pre = run({ ticks: 5, scenario: quiet({ lanterns: [{ id: 'L2', lit: true }] }) });
  assert.equal(pre.events.length, 0);
  assert.equal(pre.end.score, 0);
});

test('win: all lanterns lit -> game_over won/all_lit, bonus, stops early', () => {
  const lanterns = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true })).concat([{ id: 'L5', pos: [0, 0, 1], deposited: 0 }]);
  const r = run({ ticks: 600, scenario: quiet({ player: { carried: T.lantern_cost }, lanterns }), inputs: { frames: [{ tick: 0, interact: true }] } });
  const go = r.events.find((e) => e.name === 'game_over');
  assert.deepEqual(go, { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
  const tl = Math.floor(T.night1_duration_s - 1 / 60);
  assert.deepEqual(r.end, { type: 'end', ticks: 1, state: 'won', score: T.score.per_lantern + tl * T.score.per_second_left + T.flames * T.score.per_flame_left });
});

test('dawn: time runs out -> lost/dawn; scenario time_left_s honoured', () => {
  const r = run({ ticks: 1000, scenario: quiet({ time_left_s: 2 }) });
  assert.deepEqual(r.events.at(-1).data, { result: 'lost', reason: 'dawn' });
  assert.equal(r.events.at(-1).tick, 120);
  assert.equal(r.end.state, 'lost');
  assert.equal(r.end.ticks, 120);
});

test('shade hit: flame lost, floor(carried*ratio) dropped, invulnerability, no_flames loss', () => {
  const r = run({ ticks: 600, scenario: quiet({ player: { carried: 3, flames: 2 }, shades: [{ id: 'X', pos: [0, 1, 0] }] }) });
  const hits = r.events.filter((e) => e.name === 'player_hit');
  assert.deepEqual(hits[0], { type: 'event', tick: 1, name: 'player_hit', data: { by: 'shade', flames: 1, dropped: Math.floor(3 * T.hit_drop_ratio) } });
  assert.equal(hits[1].tick - hits[0].tick, Math.round(T.invuln_s * 60));
  assert.deepEqual(r.events.at(-1).data, { result: 'lost', reason: 'no_flames' });
});

test('pulse: costs light, stuns within radius, pushes away, scores, cooldown', () => {
  const sc = quiet({ player: { carried: 3 }, shades: [{ id: 'A', pos: [T.pulse_radius, 1, 0] }, { id: 'B', pos: [0, 1, T.pulse_radius + 1] }] });
  const frames = [{ tick: 0, pulse: true }, { tick: 1, pulse: false }, { tick: 2, pulse: true }, { tick: 3, pulse: false }];
  const r = run({ ticks: 1, every: 1, scenario: sc, inputs: { frames } });
  assert.deepEqual(r.events[0].data, { stunned_ids: ['A'] });
  const a = r.snaps.at(-1).shades.find((s) => s.id === 'A');
  assert.equal(a.state, 'stunned');
  assert.equal(a.pos[0], T.pulse_radius + T.pulse_push_m);
  assert.equal(r.end.score, T.score.per_stun);
  assert.equal(r.snaps.at(-1).player.carried, 3 - T.pulse_cost);
  const cd = run({ ticks: 5, scenario: sc, inputs: { frames } });
  assert.equal(cd.events.filter((e) => e.name === 'pulse').length, 1, 'second pulse blocked by cooldown');
  const stun = run({ ticks: Math.round(T.pulse_stun_s * 60) + 1, every: 1, scenario: sc, inputs: { frames } });
  assert.equal(stun.snaps.at(-1).shades.find((s) => s.id === 'A').state, 'chase');
});

test('safe_radius: shade never enters a lit lantern radius', () => {
  const sc = quiet({ player: { pos: [0, 0, 20] }, lanterns: [{ id: 'L1', pos: [0, 0, 20], lit: true }], shades: [{ id: 'S', pos: [0, 1, 0] }] });
  const r = run({ ticks: 600, every: 10, scenario: sc });
  for (const s of r.snaps) assert.ok(Math.hypot(s.shades[0].pos[0], s.shades[0].pos[2] - 20) >= T.safe_radius - 1e-3);
  assert.equal(r.events.filter((e) => e.name === 'player_hit').length, 0);
});

test('errors: malformed inputs/scenario exit 2; bad args exit non-zero with stderr', () => {
  assert.equal(run({ inputs: '{not json' }).status, 2);
  assert.equal(run({ inputs: { frames: [{ tick: 5 }, { tick: 5 }] } }).status, 2);
  assert.equal(run({ inputs: { frames: [{ tick: 0, move: [2, 0] }] } }).status, 2);
  assert.equal(run({ scenario: { motes: 'x' } }).status, 2);
  const bad = run({ raw: ['--bogus'] });
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /error/);
});
