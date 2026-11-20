#!/usr/bin/env node
// Headless runner. Placeholder "hello" until the Test Contract (PRD-0) defines the real I/O format.
import { createWorld, step, snapshot } from '../core/world.js';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

const seed = Number(opt('seed', 1));
const ticks = Number(opt('ticks', 60));
const world = createWorld({ seed });
for (let i = 0; i < ticks; i++) step(world, { moveX: 1, moveZ: 0 });
process.stdout.write(JSON.stringify({ hello: 'Dao Den Long', seed, ...snapshot(world) }) + '\n');
