// TICKET-03 "Đèn cạn dầu": fuel, relight, refuel, drain, new win rule, capacity, scoring (contract v1.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, quiet } from './helpers.js';

const far = { pos: [-30, 0, 0] }; // player far from everything (> 12 m detection)

test('fuel: lit lantern starts at 100 and decays 1/s; snapshot has fuel/ever_lit/relit_count/capacity', () => {
  const r = run({ ticks: 60, every: 60, scenario: quiet({ player: far, lanterns: [{ id: 'L1', lit: true }] }) });
  const l = r.snaps[0].lanterns[0];
  assert.deepEqual([l.fuel, l.ever_lit, l.relit_count], [100, true, 0]);
  assert.equal(r.snaps[1].lanterns[0].fuel, 99);
  assert.equal(r.snaps[0].lanterns[1].fuel, 0);
  assert.equal(r.snaps[0].player.capacity, 10);
});

test('fuel <= 0: lantern goes out (lantern_out), deposited 0, ever_lit kept; relight costs 5 and scores 5/mote + 40', () => {
  const sc = quiet({ player: { pos: [0, 0, 0], carried: 6 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 1 }] });
  const r = run({ ticks: 62, every: 1, scenario: sc, inputs: { frames: [{ tick: 60, interact: true }] } });
  assert.deepEqual(r.ev('lantern_out')[0], { type: 'event', tick: 60, name: 'lantern_out', data: { lantern_id: 'L1' } });
  assert.deepEqual(r.snaps[60].lanterns[0], { id: 'L1', pos: [0, 0, 1], lit: false, deposited: 0, fuel: 0, ever_lit: true, relit_count: 0 });
  assert.deepEqual(r.ev('deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
  assert.deepEqual(r.ev('lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  assert.equal(r.snaps[61].lanterns[0].relit_count, 1);
  assert.equal(r.snaps[61].lanterns[0].fuel, 100);
  assert.equal(r.end.score, 5 * 5 + 40);
});

test('refuel: used = min(carried, ceil((100-fuel)/10)), fuel capped at 100, +5 per mote', () => {
  const sc = quiet({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 55 }] });
  const r = run({ ticks: 1, every: 1, scenario: sc, inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.deepEqual(r.ev('refuel')[0].data, { lantern_id: 'L1', amount: 5, fuel: 100 });
  assert.equal(r.snaps[1].player.carried, 5);
  assert.equal(r.end.score, 25);
  const few = run({ ticks: 1, scenario: quiet({ player: { carried: 2 }, lanterns: [{ id: 'L1', pos: [0, 0, 1], lit: true, fuel: 20 }] }), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.deepEqual(few.ev('refuel')[0].data, { lantern_id: 'L1', amount: 2, fuel: 40 });
});

test('capacity = 10 + 2 x successful_lights (max 20), scenario successful_lights honoured', () => {
  assert.equal(run({ ticks: 0, scenario: quiet({ player: { successful_lights: 3 } }) }).snaps[0].player.capacity, 16);
  assert.equal(run({ ticks: 0, scenario: quiet({ player: { successful_lights: 9 } }) }).snaps[0].player.capacity, 20);
  const r = run({ ticks: 1, every: 1, scenario: quiet({ player: { carried: 10 }, lanterns: [{ id: 'L1', pos: [0, 0, 1] }] }), inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.equal(r.snaps[1].player.capacity, 12);
});

test('drain: wander shade goes to weak lantern (< 30), drains 5/s within 2 m, fuel_drain every 60 ticks', () => {
  const sc = quiet({ player: far, lanterns: [{ id: 'L1', pos: [10, 0, 0], lit: true, fuel: 29 }], shades: [{ id: 'S1', pos: [10, 1, 4] }] });
  const r = run({ ticks: 200, every: 1, scenario: sc });
  const t = r.snaps.findIndex((s) => s.shades[0].state === 'drain');
  assert.ok(t > 0 && t < 40, `reached drain at ${t}`);
  const fe = r.ev('fuel_drain');
  assert.ok(fe.length >= 2);
  assert.equal(fe[1].tick - fe[0].tick, 60);
  assert.equal(fe[0].data.lantern_id, 'L1'); assert.equal(fe[0].data.shade_id, 'S1');
  // over 60 ticks of draining the lantern loses 6 fuel (1 decay + 5 drain)
  const a = r.snaps[t + 10].lanterns[0].fuel, b = r.snaps[t + 70].lanterns[0].fuel;
  assert.ok(Math.abs(a - b - 6) <= 0.11, `${a} -> ${b}`);
});

test('drain -> chase when Mây within 6 m; lantern at exactly 30+ keeps its safe zone', () => {
  const sc = quiet({ player: { pos: [10, 0, -3.5] }, lanterns: [{ id: 'L1', pos: [10, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [10, 1, 1.5], state: 'drain', target_lantern_id: 'L1' }] });
  assert.equal(run({ ticks: 1, every: 1, scenario: sc }).snaps[1].shades[0].state, 'chase');
  const safe = run({ ticks: 120, every: 10, scenario: quiet({ player: far, lanterns: [{ id: 'L1', pos: [10, 0, 0], lit: true, fuel: 90 }], shades: [{ id: 'S1', pos: [10, 1, 9] }] }) });
  for (const s of safe.snaps) assert.ok(Math.hypot(s.shades[0].pos[0] - 10, s.shades[0].pos[2]) >= 6 - 1e-3);
});

test('refuel to >= 30 evicts shades inside within 30 ticks without damage; pulse on a draining shade scores 15', () => {
  const sc = quiet({ player: { pos: [0, 0, 1.5], carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [1.5, 1, 0], state: 'drain', target_lantern_id: 'L1' }] });
  const r = run({ ticks: 60, every: 1, scenario: sc, inputs: { frames: [{ tick: 0, interact: true }] } });
  assert.ok(r.ev('refuel')[0].data.fuel >= 30);
  assert.ok(Math.hypot(r.snaps[30].shades[0].pos[0], r.snaps[30].shades[0].pos[2]) >= 6 - 1e-3);
  assert.equal(r.ev('player_hit').length, 0);
  const p = run({ ticks: 1, scenario: quiet({ player: { pos: [10, 0, -6.5], carried: 3 }, lanterns: [{ id: 'L1', pos: [10, 0, 0], lit: true, fuel: 20 }], shades: [{ id: 'S1', pos: [10, 1, -2], state: 'drain', target_lantern_id: 'L1' }] }), inputs: { frames: [{ tick: 0, pulse: true }] } });
  assert.deepEqual(p.ev('pulse')[0].data, { stunned_ids: ['S1'] });
  assert.equal(p.end.score, 15);
});

test('dawn: won/dawn_survived with >= ceil(0.6 n) lit; bonus 50 + floor(fuel) per lit + 50 per flame', () => {
  const lit3 = ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true }));
  const r = run({ ticks: 100, scenario: quiet({ player: far, time_left_s: 1, lanterns: lit3 }) });
  assert.deepEqual(r.ev('game_over')[0], { type: 'event', tick: 60, name: 'game_over', data: { result: 'won', reason: 'dawn_survived' } });
  assert.equal(r.end.score, 3 * (50 + 99) + 3 * 50);
  const lose = run({ ticks: 100, scenario: quiet({ player: far, time_left_s: 1, lanterns: lit3.slice(0, 2) }) });
  assert.deepEqual(lose.ev('game_over')[0].data, { result: 'lost', reason: 'dawn' });
  assert.equal(lose.end.score, 0);
  const n2 = run({ night: 2, ticks: 100, scenario: quiet({ time_left_s: 1, lanterns: lit3 }) });
  assert.equal(n2.ev('game_over')[0].data.result, 'lost', 'Night 2 needs 4/6');
});

test('Night durations 240 / 270 / 300 s', () => {
  assert.deepEqual([1, 2, 3].map((night) => run({ night, ticks: 0 }).snaps[0].time_left_s), [240, 270, 300]);
});
