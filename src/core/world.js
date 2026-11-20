// Pure game logic: no DOM, no Three.js, no wall-clock time. Fixed timestep only.
import { createRng } from './rng.js';

export const TICK_DT = 1 / 60;

export function createWorld({ seed = 1 } = {}) {
  return { seed, tick: 0, rng: createRng(seed), player: { x: 0, y: 0, z: 0 } };
}

// input: { moveX: -1..1, moveZ: -1..1 }
export function step(world, input = {}) {
  const speed = 4;
  world.player.x += (input.moveX ?? 0) * speed * TICK_DT;
  world.player.z += (input.moveZ ?? 0) * speed * TICK_DT;
  world.tick += 1;
  return world;
}

export function snapshot(world) {
  const r = (v) => Math.round(v * 1000) / 1000;
  return { tick: world.tick, player: { x: r(world.player.x), y: r(world.player.y), z: r(world.player.z) } };
}
