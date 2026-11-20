#!/usr/bin/env node
// Headless runner implementing Test Contract v1.1 (docs/lab/PRD-0.md + docs/lab/TICKET-02.md Part 4).
import { readFileSync, writeFileSync } from 'node:fs';
import { createWorld, step, snapshot } from '../core/world.js';
import { validateInputs, validateScenario, InputTimeline } from './io.js';

function fail(msg, code = 1) { process.stderr.write(`error: ${msg}\n`); process.exit(code); }

function parseArgs(argv) {
  const o = { 'snapshot-every': '10' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) fail(`unexpected argument: ${a}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) fail(`missing value for ${a}`);
    o[a.slice(2)] = v; i++;
  }
  return o;
}
const intArg = (o, k, min) => {
  if (!/^-?\d+$/.test(o[k] ?? '')) fail(`--${k} must be an integer`);
  const n = Number(o[k]);
  if (n < min) fail(`--${k} must be >= ${min}`);
  return n;
};
function readJson(path, what) {
  let txt;
  try { txt = readFileSync(path, 'utf8'); } catch (e) { fail(`cannot read ${what} file: ${path}`, 2); }
  try { return JSON.parse(txt); } catch (e) { fail(`malformed ${what} JSON: ${e.message}`, 2); }
}

const o = parseArgs(process.argv.slice(2));
const seed = intArg(o, 'seed', -2147483648);
const night = intArg(o, 'night', 1);
if (![1, 2, 3].includes(night)) fail(`--night must be 1, 2 or 3 (got ${night})`);
const ticks = intArg(o, 'ticks', 0);
const every = intArg(o, 'snapshot-every', 1);
if (!o.out) fail('--out is required');

let scenario = null, inputs = { frames: [] };
if (o.scenario) { scenario = readJson(o.scenario, 'scenario'); const e = validateScenario(scenario); if (e) fail(`invalid scenario: ${e}`, 2); }
if (o.inputs) { inputs = readJson(o.inputs, 'inputs'); const e = validateInputs(inputs); if (e) fail(`invalid inputs: ${e}`, 2); }

const world = createWorld({ seed, night, scenario });
const timeline = new InputTimeline(inputs.frames);
const lines = [
  JSON.stringify({ type: 'event', tick: 0, name: 'night_start', data: { night } }),
  JSON.stringify(snapshot(world)),
];
const over = () => world.state === 'won' || world.state === 'lost';
for (let k = 0; k < ticks && !over(); k++) {
  step(world, timeline.at(k), (name, data) => lines.push(JSON.stringify({ type: 'event', tick: k + 1, name, data })));
  if ((k + 1) % every === 0) lines.push(JSON.stringify(snapshot(world)));
}
lines.push(JSON.stringify({ type: 'end', ticks: world.tick, state: world.state, score: world.score }));
try { writeFileSync(o.out, lines.join('\n') + '\n'); } catch (e) { fail(`cannot write ${o.out}: ${e.message}`); }
