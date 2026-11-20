import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const run = (...a) => execFileSync(process.execPath, ['src/headless/cli.js', ...a], { encoding: 'utf8' });

test('headless hello runs and outputs JSON', () => {
  const out = JSON.parse(run('--seed', '7', '--ticks', '60'));
  assert.equal(out.tick, 60);
  assert.equal(out.player.x, 4);
});

test('headless is deterministic for same input', () => {
  assert.equal(run('--seed', '7', '--ticks', '120'), run('--seed', '7', '--ticks', '120'));
});
