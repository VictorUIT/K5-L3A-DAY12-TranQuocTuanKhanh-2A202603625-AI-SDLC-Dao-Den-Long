// TICKET-04: leaderboard rules + export command, soak, contract v1.3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateName, addEntry, isoWithOffset } from '../src/core/leaderboard.js';
import { createWorld, step } from '../src/core/world.js';

test('contract v1.3 has bench_cmd and soak_cmd', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3');
  assert.match(c.bench_cmd, /bench/); assert.match(c.soak_cmd, /soak/);
});

test('leaderboard: name 3-12 [A-Za-z0-9_] (+ Vietnamese), top 10, score desc, ties -> earlier first', () => {
  assert.equal(validateName('ab'), null);
  assert.equal(validateName('abc_123'), 'abc_123');
  assert.equal(validateName('Mây_Đêm'), 'Mây_Đêm');
  assert.equal(validateName('bad name'), null);
  assert.equal(validateName('x'.repeat(13)), null);
  let e = [];
  for (let i = 0; i < 12; i++) e = addEntry(e, { name: `p${i}xx`, score: i * 10, nights_won: 1, seed: i, achieved_at: `2026-11-20T10:${String(i).padStart(2, '0')}:00+07:00` });
  e = addEntry(e, { name: 'late', score: 110, nights_won: 3, seed: 99, achieved_at: '2026-11-20T11:00:00+07:00' });
  assert.equal(e.length, 10);
  assert.deepEqual(e.slice(0, 3).map((x) => x.name), ['p11xx', 'late', 'p10xx']);
  assert.match(isoWithOffset(), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
});

test('leaderboard persists on disk and --export-leaderboard writes entries in order', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ddl-lb-'));
  const env = { ...process.env, DDL_DATA_DIR: dir };
  const code = `import('./scripts/server.mjs').then(async (m) => { const s = await m.startServer(0); const u = 'http://127.0.0.1:' + s.address().port + '/api/leaderboard';
    for (const [n, sc] of [['aaa', 5], ['bbb', 50], ['ccc', 20]]) await fetch(u, { method: 'POST', body: JSON.stringify({ name: n, score: sc, nights_won: 1, seed: 1 }) });
    s.close(); })`;
  assert.equal(spawnSync(process.execPath, ['-e', code], { env }).status, 0);
  const out = join(dir, 'out.json');
  assert.equal(spawnSync(process.execPath, ['scripts/play.mjs', '--export-leaderboard', out], { env }).status, 0);
  const entries = JSON.parse(readFileSync(out, 'utf8')).entries;
  assert.deepEqual(entries.map((x) => x.name), ['bbb', 'ccc', 'aaa']);
  for (const k of ['name', 'score', 'nights_won', 'achieved_at', 'seed']) assert.ok(k in entries[0], k);
});

test('bench scene: 200 wander shades, 100 motes, L1-L3 lit fuel 100; no damage/decay/end', () => {
  const w = createWorld({ seed: 42, night: 1, bench: true });
  assert.equal(w.shades.length, 200); assert.equal(w.motes.length, 100);
  assert.deepEqual(w.lanterns.map((l) => l.lit), [true, true, true, false, false]);
  for (let i = 0; i < 60 * 300; i++) step(w, {});
  assert.equal(w.state, 'playing');
  assert.equal(w.player.flames, 3);
  assert.equal(w.lanterns[0].fuel, 6000);
  assert.ok(w.shades.every((s) => s.state === 'wander' || s.state === 'drain'));
});

test('soak: 10 nights, 0 crashes, mem_end <= 1.2 x mem_start', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ddl-soak-')), 'soak.json');
  const r = spawnSync(process.execPath, ['--expose-gc', 'scripts/soak.mjs', '--seed', '7', '--nights', '10', '--out', out]);
  assert.equal(r.status, 0);
  const s = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(s.nights, 10); assert.equal(s.crashes, 0); assert.equal(s.results.length, 10);
  assert.ok(s.mem_end_mb <= 1.2 * s.mem_start_mb, `${s.mem_end_mb} > 1.2 x ${s.mem_start_mb}`);
});
