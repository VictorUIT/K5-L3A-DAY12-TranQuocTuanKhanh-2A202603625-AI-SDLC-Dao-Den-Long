#!/usr/bin/env node --expose-gc
// Soak test (TICKET-04 §2): N headless nights in ONE process, Night 1->2->3 rotating, seed+i, random seeded input.
//   node scripts/soak.mjs --seed 7 --nights 10 --out soak.json
import { writeFileSync } from 'node:fs';
import { createWorld, step } from '../src/core/world.js';
import { createRng } from '../src/core/rng.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seed = Number(opt('seed', 7)), nights = Number(opt('nights', 10)), out = opt('out', 'soak.json');
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) { console.error('error: --seed and --nights must be integers'); process.exit(1); }

const rssMb = () => Math.round((process.memoryUsage().rss / 2 ** 20) * 10) / 10;
const MAX_TICKS = 21600; // longest standard night is 300 s = 18000 ticks; hard cap per contract
const t0 = performance.now();
let crashes = 0, memStart = null, world = null;
const results = [];
for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1, s = seed + i;
  try {
    world = createWorld({ seed: s, night });
    if (i === 0) { global.gc?.(); memStart = rssMb(); }
    const rng = createRng(s ^ 0x5eed);
    let move = [0, 0];
    const prev = {};
    for (let k = 0; k < MAX_TICKS && (world.state === 'playing' || world.state === 'paused'); k++) {
      if (k % 30 === 0) { const a = rng() * Math.PI * 2; move = [Math.cos(a), Math.sin(a)]; }
      const want = { jump: rng() < 0.05, dash: rng() < 0.03, pulse: rng() < 0.02, interact: rng() < 0.1 };
      // Actions trigger on false->true; a "press" this tick is sent as true after a false.
      const input = { move, cam_yaw_deg: 0 };
      for (const b of Object.keys(want)) { input[b] = want[b] && !prev[b]; prev[b] = input[b]; }
      step(world, input);
    }
    results.push(world.state === 'won' ? 'won' : 'lost');
  } catch (e) {
    crashes++; results.push('crash');
    console.error(`night ${i + 1} crashed: ${e.stack}`);
  }
  world = null; // reset before the next night: drop the world and collect it
  global.gc?.();
  if (process.env.SOAK_TRACE) console.error(`after night ${i + 1}: rss ${rssMb()} MB`);
}
global.gc?.();
const report = { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: rssMb(), duration_s: Math.round((performance.now() - t0) / 100) / 10 };
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
