import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
let n = 0;

// Runs the real headless CLI (black-box, like the hidden grader) and parses the JSONL.
export function run({ seed = 1, night = 1, ticks = 60, scenario, inputs, every = 10, raw = [] } = {}) {
  const out = join(dir, `o${++n}.jsonl`);
  const args = ['src/headless/cli.js', '--seed', String(seed), '--night', String(night), '--ticks', String(ticks), '--out', out, '--snapshot-every', String(every), ...raw];
  if (scenario !== undefined) { const f = join(dir, `s${n}.json`); writeFileSync(f, typeof scenario === 'string' ? scenario : JSON.stringify(scenario)); args.push('--scenario', f); }
  if (inputs !== undefined) { const f = join(dir, `i${n}.json`); writeFileSync(f, typeof inputs === 'string' ? inputs : JSON.stringify(inputs)); args.push('--inputs', f); }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const ms = Date.now() - t0;
  if (r.status !== 0) return { status: r.status, stderr: r.stderr, ms };
  const text = readFileSync(out, 'utf8');
  const lines = text.trim().split('\n').map((l) => JSON.parse(l));
  const events = lines.filter((l) => l.type === 'event');
  return {
    status: 0, ms, text, lines, events, end: lines.at(-1),
    snaps: lines.filter((l) => l.type === 'snapshot'),
    ev: (name) => events.filter((e) => e.name === name),
    game: events.filter((e) => e.name !== 'night_start'),
  };
}

// Scenario with no random spawns at all.
export const quiet = (extra = {}) => ({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, motes: [], shades: [], drifters: [], ...extra });
export const near = (a, b, eps = 1e-3) => Math.abs(a - b) <= eps;
