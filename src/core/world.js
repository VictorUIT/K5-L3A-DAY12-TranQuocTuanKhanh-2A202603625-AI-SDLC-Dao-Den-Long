// Pure game logic: no DOM, no Three.js, no wall-clock time. Fixed timestep (60 Hz) only.
import { createRng } from './rng.js';
import { TUNING, WORLD } from './tuning.js';

export const TPS = 60;
export const TICK_DT = 1 / TPS;
const T = TUNING;
const r3 = (v) => Math.round(v * 1000) / 1000 + 0; // +0 turns -0 into 0
// Timers are integer tick counters to avoid float drift.
const secToTicks = (s) => Math.round(s * TPS);
const dxz = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

function defaultLanterns() {
  const out = [];
  for (let i = 0; i < T.lantern_count_night1; i++) {
    const a = (i / T.lantern_count_night1) * Math.PI * 2;
    out.push({ id: `L${i + 1}`, pos: [r3(Math.sin(a) * WORLD.lantern_ring_radius), 0, r3(Math.cos(a) * WORLD.lantern_ring_radius)], lit: false, deposited: 0 });
  }
  return out;
}

function randomGroundPoint(rng, minR, maxR) {
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(minR * minR + rng() * (maxR * maxR - minR * minR));
  return [r3(Math.sin(a) * r), 0, r3(Math.cos(a) * r)];
}

export function createWorld({ seed = 1, scenario = null } = {}) {
  const sc = scenario ?? {};
  const w = {
    seed, rng: createRng(seed), steps: 0, state: 'playing', result: null, score: 0,
    duration: sc.time_left_s ?? T.night1_duration_s,
    player: { pos: [0, 0, 0], vy: 0, flames: T.flames, carried: 0, invuln: 0, pulseCd: 0 },
    lanterns: defaultLanterns(), motes: [], shades: [],
    nextMoteId: 1, nextShadeId: 1, moteTimer: 0, shadeTimer: 0, shadesSpawned: 0,
    randomMotes: sc.random_motes ?? true, randomShades: sc.random_shades ?? true,
    prevButtons: { jump: false, interact: false, pulse: false },
  };
  if (sc.player) {
    if (sc.player.pos) w.player.pos = [...sc.player.pos];
    if (sc.player.carried != null) w.player.carried = sc.player.carried;
    if (sc.player.flames != null) w.player.flames = sc.player.flames;
  }
  if (sc.lanterns) for (const l of sc.lanterns) {
    const t = w.lanterns.find((x) => x.id === l.id);
    if (!t) continue;
    if (l.pos) t.pos = [...l.pos];
    if (l.deposited != null) t.deposited = l.deposited;
    if (l.lit != null) t.lit = !!l.lit;
  }
  if (sc.motes) w.motes = sc.motes.map((p) => ({ id: `M${w.nextMoteId++}`, pos: [p[0], 0, p[2]] }));
  else if (w.randomMotes) for (let i = 0; i < WORLD.mote_initial; i++) spawnMote(w);
  if (sc.shades) w.shades = sc.shades.map((s) => {
    const id = s.id ?? `S${w.nextShadeId}`;
    w.nextShadeId++;
    return { id, pos: [s.pos[0], s.pos[1] ?? WORLD.shade_height, s.pos[2]], state: 'chase', stun: 0 };
  });
  return w;
}

function spawnMote(w) {
  w.motes.push({ id: `M${w.nextMoteId++}`, pos: randomGroundPoint(w.rng, 2, WORLD.island_radius - 2) });
}

function spawnShade(w, emit) {
  const a = w.rng() * Math.PI * 2, R = WORLD.island_radius - 1;
  const s = { id: `S${w.nextShadeId++}`, pos: [r3(Math.sin(a) * R), WORLD.shade_height, r3(Math.cos(a) * R)], state: 'chase', stun: 0 };
  w.shades.push(s);
  w.shadesSpawned++;
  emit('shade_spawned', { id: s.id });
}

export function timeLeft(w) { return Math.max(0, w.duration - w.steps / TPS); }

function endGame(w, result, reason, emit) {
  w.state = result === 'won' ? 'won' : 'lost';
  w.result = { result, reason };
  if (result === 'won') {
    w.score += T.score.per_second_left * Math.floor(timeLeft(w)) + T.score.per_flame_left * w.player.flames;
  }
  emit('game_over', { result, reason });
}

// input: { move:[x,z], cam_yaw_deg, jump, interact, pulse }. emit(name, data) is called for each event.
export function step(w, input = {}, emit = () => {}) {
  if (w.state !== 'playing') return w;
  w.steps += 1;
  const p = w.player;
  const btn = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };
  const pressed = (k) => btn[k] && !w.prevButtons[k];

  // 1. Movement (camera-relative), then clamp to island (fall disabled).
  let [mx, mz] = input.move ?? [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  p.pos[0] += wx * T.player_speed * TICK_DT;
  p.pos[2] += wz * T.player_speed * TICK_DT;
  const pr = Math.hypot(p.pos[0], p.pos[2]);
  if (pr > WORLD.island_radius) { p.pos[0] *= WORLD.island_radius / pr; p.pos[2] *= WORLD.island_radius / pr; }

  // 2. Jump (visual/vertical only; does not affect XZ distances).
  if (pressed('jump') && p.pos[1] <= 0) p.vy = WORLD.jump_velocity;
  if (p.pos[1] > 0 || p.vy > 0) {
    p.vy -= WORLD.gravity * TICK_DT;
    p.pos[1] += p.vy * TICK_DT;
    if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; }
  }

  // 3. Auto-pickup motes within pickup_radius while capacity allows (list order).
  for (let i = 0; i < w.motes.length && p.carried < T.carry_capacity; ) {
    if (dxz(w.motes[i].pos, p.pos) <= T.pickup_radius) {
      w.motes.splice(i, 1);
      p.carried += 1;
      w.score += T.score.per_mote;
      emit('mote_picked', { carried: p.carried });
    } else i++;
  }

  // 4. Interact: deposit into the nearest unlit lantern within interact_radius.
  if (pressed('interact') && p.carried > 0) {
    let best = null, bd = Infinity;
    for (const l of w.lanterns) {
      const d = dxz(l.pos, p.pos);
      if (!l.lit && d <= T.interact_radius && d < bd) { best = l; bd = d; }
    }
    if (best) {
      const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= T.lantern_cost) {
          best.lit = true;
          w.score += T.score.per_lantern;
          emit('lantern_lit', { lantern_id: best.id });
          if (w.lanterns.every((l) => l.lit)) { endGame(w, 'won', 'all_lit', emit); w.prevButtons = btn; return w; }
        }
      }
    }
  }

  // 5. Pulse: costs carried light, stuns + pushes shades within pulse_radius.
  if (p.pulseCd > 0) p.pulseCd -= 1;
  if (pressed('pulse') && p.pulseCd <= 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseCd = secToTicks(T.pulse_cooldown_s);
    const ids = [];
    for (const s of w.shades) {
      const d = dxz(s.pos, p.pos);
      if (d <= T.pulse_radius) {
        s.state = 'stunned';
        s.stun = secToTicks(T.pulse_stun_s);
        const ux = d > 1e-9 ? (s.pos[0] - p.pos[0]) / d : 1, uz = d > 1e-9 ? (s.pos[2] - p.pos[2]) / d : 0;
        s.pos[0] += ux * T.pulse_push_m;
        s.pos[2] += uz * T.pulse_push_m;
        ids.push(s.id);
      }
    }
    w.score += T.score.per_stun * ids.length;
    emit('pulse', { stunned_ids: ids });
  }

  // 6. Shades: stunned countdown, else chase; never enter safe_radius of a lit lantern.
  for (const s of w.shades) {
    if (s.state === 'stunned') {
      s.stun -= 1;
      if (s.stun <= 0) { s.stun = 0; s.state = 'chase'; }
      continue;
    }
    const d = dxz(s.pos, p.pos);
    if (d > 1e-9) {
      const stepLen = Math.min(T.shade_speed * TICK_DT, d);
      s.pos[0] += ((p.pos[0] - s.pos[0]) / d) * stepLen;
      s.pos[2] += ((p.pos[2] - s.pos[2]) / d) * stepLen;
    }
    for (const l of w.lanterns) {
      if (!l.lit) continue;
      const ld = dxz(s.pos, l.pos);
      if (ld < T.safe_radius) {
        const ux = ld > 1e-9 ? (s.pos[0] - l.pos[0]) / ld : 1, uz = ld > 1e-9 ? (s.pos[2] - l.pos[2]) / ld : 0;
        s.pos[0] = l.pos[0] + ux * T.safe_radius;
        s.pos[2] = l.pos[2] + uz * T.safe_radius;
      }
    }
  }

  // 7. Shade contact: lose a flame, drop part of carried light, brief invulnerability.
  if (p.invuln > 0) p.invuln -= 1;
  if (p.invuln <= 0) {
    const hit = w.shades.find((s) => s.state !== 'stunned' && dxz(s.pos, p.pos) <= T.shade_hit_radius);
    if (hit) {
      p.flames -= 1;
      const dropped = Math.floor(p.carried * T.hit_drop_ratio);
      p.carried -= dropped;
      p.invuln = secToTicks(T.invuln_s);
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      if (p.flames <= 0) { endGame(w, 'lost', 'no_flames', emit); w.prevButtons = btn; return w; }
    }
  }

  // 8. Spawning (only when random spawning is enabled).
  if (w.randomMotes) {
    w.moteTimer += 1;
    if (w.moteTimer >= secToTicks(WORLD.mote_respawn_s)) { w.moteTimer = 0; if (w.motes.length < WORLD.mote_max) spawnMote(w); }
  }
  if (w.randomShades && w.shadesSpawned < WORLD.shade_max) {
    w.shadeTimer += 1;
    const due = secToTicks(w.shadesSpawned === 0 ? WORLD.shade_first_s : WORLD.shade_every_s);
    if (w.shadeTimer >= due) { w.shadeTimer = 0; spawnShade(w, emit); }
  }

  // 9. Dawn.
  if (w.duration - w.steps / TPS <= 1e-9) endGame(w, 'lost', 'dawn', emit);
  w.prevButtons = btn;
  return w;
}

export function snapshot(w) {
  const v = (a) => a.map(r3);
  return {
    type: 'snapshot', tick: w.steps, sim_tick: w.steps, state: w.state,
    time_left_s: r3(timeLeft(w)), score: w.score,
    player: { pos: v(w.player.pos), flames: w.player.flames, carried: w.player.carried },
    lanterns: w.lanterns.map((l) => ({ id: l.id, pos: v(l.pos), lit: l.lit, deposited: l.deposited })),
    shades: w.shades.map((s) => ({ id: s.id, pos: v(s.pos), state: s.state })),
    motes_active: w.motes.length,
    motes: w.motes.map((m) => ({ id: m.id, pos: v(m.pos) })),
  };
}
