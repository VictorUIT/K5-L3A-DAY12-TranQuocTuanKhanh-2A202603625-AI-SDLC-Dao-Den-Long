// TICKET-02 new features: one or more headless scenarios per feature (DoD).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, quiet, near } from './helpers.js';

test('v1.1 snapshot shape', () => {
  const s = run({ night: 2, ticks: 0 }).snaps[0];
  for (const k of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(k in s, k);
  for (const k of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(k in s.player, k);
  assert.deepEqual(s.wind, { active: false, dir_deg: null });
  assert.equal(s.lanterns.length, 6);
  assert.deepEqual(s.charms, [{ id: 'C1', available: true, respawn_s: 0 }]);
  assert.equal(run({ night: 3, ticks: 0 }).snaps[0].lanterns.length, 7);
});

test('motes: 20 at distinct points at start, +1 every 240 ticks', () => {
  const r = run({ ticks: 240, every: 240, scenario: { random_shades: false, random_drifters: false } });
  assert.equal(r.snaps[0].motes_active, 20);
  assert.equal(new Set(r.snaps[0].motes.map((m) => m.pos.join())).size, 20);
  assert.equal(r.snaps[1].motes_active, 21);
  assert.ok(r.snaps[0].motes.every((m) => m.kind === 'random' && m.ttl_s === null));
});

test('shade schedule Night 1: 2 at tick 300, then every 480; state spawning; on r=37 ring', () => {
  const r = run({ ticks: 781, every: 1, scenario: { random_motes: false, random_drifters: false } });
  assert.deepEqual(r.ev('shade_spawned').map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3']]);
  const s = r.snaps[300].shades;
  assert.ok(s.every((x) => x.state === 'spawning' && near(Math.hypot(x.pos[0], x.pos[2]), 37)));
  for (const snap of r.snaps) for (const x of snap.shades) assert.ok(['spawning', 'wander', 'chase', 'recoil', 'stunned'].includes(x.state));
});

test('dash: 14 m/s for 12 ticks (2.8 m), cooldown 1.5 s from start, idle uses facing (+Z)', () => {
  const r = run({ ticks: 12, every: 12, scenario: quiet(), inputs: { frames: [{ tick: 0, dash: true }] } });
  assert.equal(r.ev('dash').length, 1);
  assert.ok(near(r.snaps.at(-1).player.pos[2], 2.8));
  const frames = [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }, { tick: 31, dash: false }, { tick: 95, dash: true }];
  const cd = run({ ticks: 100, scenario: quiet(), inputs: { frames } });
  assert.deepEqual(cd.ev('dash').map((e) => e.tick), [1, 96]);
});

test('air dash keeps altitude', () => {
  const r = run({ ticks: 30, every: 1, scenario: quiet(), inputs: { frames: [{ tick: 0, jump: true }, { tick: 10, dash: true }] } });
  const y = r.snaps[11].player.pos[1];
  for (let t = 12; t <= 22; t++) assert.ok(near(r.snaps[t].player.pos[1], y), `tick ${t}`);
});

test('fall off island: once, ignores invuln, -1 flame, lose all motes, respawn after 60 ticks with invuln', () => {
  const sc = quiet({ player: { pos: [39.5, 0, 0], carried: 4, invuln_ticks: 600 } });
  const r = run({ ticks: 400, every: 1, scenario: sc, inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 20, move: [0, 0] }] } });
  const hits = r.ev('player_hit');
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 4 });
  const t = hits[0].tick;
  assert.deepEqual(r.snaps[t + 60].player.pos, [0, 0, 0]);
  assert.equal(r.snaps[t + 60].player.invuln, true);
  assert.equal(r.snaps[t + 60].player.carried, 0);
  const dead = run({ ticks: 400, scenario: quiet({ player: { pos: [39.5, 0, 0], flames: 1 } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  assert.deepEqual(dead.ev('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('Night 2 bridge is walkable; jump pad launches to island B', () => {
  const bridge = run({ night: 2, ticks: 240, every: 240, scenario: quiet({ player: { pos: [25, 0, 0] } }), inputs: { frames: [{ tick: 0, move: [1, 0] }] } });
  assert.equal(bridge.ev('player_hit').length, 0);
  assert.ok(bridge.snaps.at(-1).player.pos[0] > 44);
  const pad = run({ night: 2, ticks: 200, every: 1, scenario: quiet({ player: { pos: [20, 0, 16.5] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 5, move: [0, 0] }] } });
  assert.equal(pad.ev('player_hit').length, 0);
  const last = pad.snaps.at(-1).player;
  assert.equal(last.grounded, true);
  assert.ok(Math.hypot(last.pos[0] - 70, last.pos[2]) <= 28, `landed at ${last.pos}`);
});

test('Night 3: tier edges are walls, ramp leads up to tier 1, pad lands on tier 2, tower blocks', () => {
  const wall = run({ night: 3, ticks: 120, every: 120, scenario: quiet({ player: { pos: [0, 0, -10] } }), inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  const wp = wall.snaps.at(-1).player.pos;
  assert.equal(wp[1], 0); assert.ok(Math.hypot(wp[0], wp[2]) >= 8 - 1e-3);
  const a = (30 * Math.PI) / 180;
  const ramp = run({ night: 3, ticks: 120, every: 120, scenario: quiet({ player: { pos: [31 * Math.cos(a), 0, 31 * Math.sin(a)] } }), inputs: { frames: [{ tick: 0, move: [-Math.cos(a), -Math.sin(a)] }] } });
  assert.equal(ramp.snaps.at(-1).player.pos[1], 3);
  const pad = run({ night: 3, ticks: 150, every: 150, scenario: quiet({ player: { pos: [0, 3, 14.5] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }, { tick: 20, move: [0, 0] }] } });
  const pp = pad.snaps.at(-1).player;
  assert.equal(pp.pos[1], 6); assert.ok(Math.hypot(pp.pos[0], pp.pos[2]) <= 8);
  const tower = run({ night: 3, ticks: 120, every: 120, scenario: quiet({ player: { pos: [0, 6, 5] } }), inputs: { frames: [{ tick: 0, move: [0, -1] }] } });
  assert.ok(Math.hypot(tower.snaps.at(-1).player.pos[0], tower.snaps.at(-1).player.pos[2]) >= 2 - 1e-3);
});

test('Night 3 wind: every 30 s for 5 s, pushes player 2 m/s', () => {
  const r = run({ night: 3, ticks: 2101, every: 1, scenario: quiet({ wind_enabled: true }) });
  assert.equal(r.snaps[1799].wind.active, false);
  assert.equal(r.snaps[1800].wind.active, true);
  assert.equal(r.snaps[2100].wind.active, false);
  const p0 = r.snaps[1800].player.pos, p1 = r.snaps[1860].player.pos;
  assert.ok(near(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]), 2, 0.05));
});

test('charm: pickup event, 600 ticks, 7.2 m/s, dash without cooldown, respawn 2700', () => {
  const r = run({ night: 2, ticks: 70, every: 1, scenario: quiet({ player: { pos: [34.5, 0, 0] } }), inputs: { frames: [{ tick: 0, move: [1, 0] }, { tick: 1, move: [0, 0] }, { tick: 2, move: [0, 1] }] } });
  assert.deepEqual(r.ev('charm_picked')[0].data, { charm_id: 'C1', charm_ticks: 600 });
  assert.equal(r.snaps.at(-1).charms[0].available, false);
  const z = (t) => r.snaps[t].player.pos[2];
  assert.ok(near(z(62) - z(2), 7.2, 0.01));
  const frames = [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 14, dash: true }];
  const d = run({ night: 2, ticks: 20, scenario: quiet({ player: { charm_ticks: 600 } }), inputs: { frames } });
  assert.deepEqual(d.ev('dash').map((e) => e.tick), [1, 15], 'press while dashing ignored, no cooldown after');
});

test('Gió Lạc: chase when carrying >= 5 within 15 m, steals min(3, carried), flees 240 ticks then removed', () => {
  const r = run({ night: 2, ticks: 300, every: 1, scenario: quiet({ player: { carried: 6 }, drifters: [{ id: 'D1', pos: [5, 1, 0] }] }) });
  assert.equal(r.snaps[1].drifters[0].state, 'chase');
  const st = r.ev('drifter_steal');
  assert.equal(st.length, 1);
  assert.deepEqual(st[0].data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(r.snaps[st[0].tick].drifters[0].state, 'flee');
  assert.equal(r.snaps[st[0].tick + 240].drifters[0].state, 'removed');
  const idle = run({ night: 2, ticks: 60, scenario: quiet({ player: { carried: 4 }, drifters: [{ id: 'D1', pos: [3, 1, 0] }] }) });
  assert.equal(idle.ev('drifter_steal').length, 0);
});

test('Gió Lạc + pulse: chase -> flee without stealing; flee with loot -> drops all as dropped motes', () => {
  const a = run({ night: 2, ticks: 1, every: 1, scenario: quiet({ player: { carried: 6 }, drifters: [{ id: 'D1', pos: [4, 1, 0], state: 'chase' }] }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.equal(a.snaps[1].drifters[0].state, 'flee');
  assert.equal(a.ev('drifter_steal').length, 0);
  const b = run({ night: 2, ticks: 125, every: 1, scenario: quiet({ player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1, 0], state: 'flee', stolen: 3 }] }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.deepEqual(b.ev('drifter_drop')[0].data, { drifter_id: 'D1', amount: 3 });
  assert.equal(b.snaps[1].motes.filter((m) => m.kind === 'dropped').length, 3);
  assert.equal(b.snaps[121].drifters[0].state, 'removed');
});

test('pause: tick advances, sim_tick/time freeze, snapshot state paused, events paused/resumed', () => {
  const frames = [{ tick: 0, move: [0, 1] }, { tick: 10, pause: true }, { tick: 11, pause: false }, { tick: 20, pause: true }];
  const r = run({ ticks: 30, every: 1, scenario: quiet(), inputs: { frames } });
  assert.deepEqual(r.game.map((e) => [e.tick, e.name]), [[11, 'paused'], [21, 'resumed']]);
  assert.equal(r.snaps[15].state, 'paused');
  assert.equal(r.snaps[15].sim_tick, 10);
  assert.deepEqual(r.snaps[15].player.pos, r.snaps[10].player.pos);
  assert.equal(r.snaps[15].time_left_s, r.snaps[10].time_left_s);
  assert.equal(r.snaps[21].sim_tick, 11);
});

test('performance: a full night (21,600 ticks) finishes in <= 30 s', () => {
  const r = run({ night: 3, ticks: 21600, every: 10, scenario: { time_left_s: 400, player: { flames: 100000 } } });
  assert.equal(r.end.ticks, 21600);
  assert.ok(r.ms < 30000, `took ${r.ms} ms`);
});
