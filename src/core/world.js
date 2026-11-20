// Pure game logic (contract v1.2, TICKET-02 + TICKET-03). No DOM, no three, no wall clock. Fixed 60 Hz.
// Per-tick order is mandated by TICKET-02 "Thứ tự xử lý trong một tick"; keep step() in that order.
import { createRng } from './rng.js';
import { TUNING as T, C } from './tuning.js';
import { MAPS } from './maps.js';

export const TPS = 60;
export const TICK_DT = 1 / TPS;
const r3 = (v) => Math.round(v * 1000) / 1000 + 0;
const dxz = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const idNum = (id) => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : 0; };
const byId = (a, b) => idNum(a.id) - idNum(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
// Fuel is stored as integer 1/60 units (TICKET-03 precision note): FUEL_MAX = 100 * 60.
const FU = TPS, FUEL_MAX = T.fuel_max * FU, LOW_FUEL = T.low_fuel_threshold * FU;
const capacityOf = (p) => Math.min(T.capacity_max, T.carry_capacity + 2 * p.successfulLights);
const isSafe = (l) => l.lit && l.fuel >= LOW_FUEL;

export function createWorld({ seed = 1, night = 1, scenario = null } = {}) {
  const map = MAPS[night];
  if (!map) throw new Error(`unknown night ${night}`);
  const sc = scenario ?? {};
  const w = {
    seed, night, map, rng: createRng(seed), tick: 0, sim: 0, state: 'playing', result: null, score: 0,
    timeLeftTicks: Math.round((sc.time_left_s ?? map.duration) * TPS),
    player: {
      pos: [...map.start], vel: [0, 0, 0], grounded: true, facing: [0, 1],
      flames: T.flames, carried: 0, invuln: 0, dashCd: 0, pulseCd: 0, charm: 0,
      dash: 0, dashDir: [0, 0], launch: null, fallWait: 0, successfulLights: 0,
    },
    lanterns: map.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0, fuel: 0, everLit: false, relitCount: 0 })),
    motes: [], shades: [], drifters: [],
    charms: map.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawn: 0 })),
    nextMote: 1, nextShade: 1, nextDrifter: 1,
    randomMotes: sc.random_motes ?? true, randomShades: sc.random_shades ?? true,
    randomDrifters: sc.random_drifters ?? map.drifters, windEnabled: sc.wind_enabled ?? map.wind,
    wind: { active: false, dir: 0, left: 0, pendingDir: null },
    prev: { jump: false, interact: false, pulse: false, dash: false, pause: false },
    safeLit: new Set(),
  };
  const p = w.player;
  if (sc.player) {
    const sp = sc.player;
    if (sp.pos) p.pos = [...sp.pos];
    if (sp.carried != null) p.carried = sp.carried;
    if (sp.flames != null) p.flames = sp.flames;
    if (sp.invuln_ticks != null) p.invuln = sp.invuln_ticks;
    if (sp.dash_cd_ticks != null) p.dashCd = sp.dash_cd_ticks;
    if (sp.pulse_cd_ticks != null) p.pulseCd = sp.pulse_cd_ticks;
    if (sp.charm_ticks != null) p.charm = sp.charm_ticks;
    if (sp.successful_lights != null) p.successfulLights = sp.successful_lights;
  }
  const g = map.ground(p.pos[0], p.pos[2]);
  p.grounded = g !== null && Math.abs(p.pos[1] - g) < 1e-6;
  if (sc.lanterns) for (const l of sc.lanterns) {
    const t = w.lanterns.find((x) => x.id === l.id);
    if (!t) continue;
    if (l.pos) t.pos = [...l.pos];
    if (l.deposited != null) t.deposited = l.deposited;
    if (l.lit != null) t.lit = !!l.lit;
    if (l.ever_lit != null) t.everLit = !!l.ever_lit;
    if (t.lit) { t.everLit = l.ever_lit ?? true; t.fuel = Math.round((l.fuel ?? T.fuel_max) * FU); }
    else t.fuel = 0;
  }
  for (const l of w.lanterns) if (isSafe(l)) w.safeLit.add(l.id); // pre-lit: zone exists, no eviction
  if (sc.motes) w.motes = sc.motes.map((m) => {
    const pos = Array.isArray(m) ? m : m.pos;
    const kind = Array.isArray(m) ? 'random' : m.kind ?? 'random';
    return { id: `M${w.nextMote++}`, pos: [...pos], kind, ttl: kind === 'dropped' ? (m.ttl_ticks ?? C.dropped_ttl_ticks) : null, born: 0, point: null };
  });
  else if (w.randomMotes) {
    for (let i = 0; i < C.mote_initial; i++) spawnRandomMote(w, 0);
  }
  if (sc.shades) w.shades = sc.shades.map((s) => {
    const id = s.id ?? `S${w.nextShade}`;
    w.nextShade++;
    const state = s.state ?? 'wander'; // TA: scenario shades skip spawning and start in wander
    const sh = newShade(id, s.pos, state);
    if (s.state_ticks_left != null) sh.left = s.state_ticks_left;
    else if (state === 'stunned') sh.left = C.stun_ticks;
    else if (state === 'recoil') sh.left = C.shade_recoil_ticks;
    else if (state === 'spawning') sh.left = C.shade_spawning_ticks;
    if (s.target_lantern_id != null) sh.lantern = s.target_lantern_id;
    return sh;
  });
  if (sc.drifters) w.drifters = sc.drifters.map((d) => {
    const id = d.id ?? `D${w.nextDrifter}`;
    w.nextDrifter++;
    return { id, pos: [...d.pos], state: d.state ?? 'idle', stolen: d.stolen ?? 0, left: d.state_ticks_left ?? (d.state === 'flee' ? C.drifter_flee_ticks : 0), stoleOnce: (d.stolen ?? 0) > 0, target: null, born: 0 };
  });
  if (sc.charms) w.charms = sc.charms.map((c, i) => ({
    id: c.id ?? `C${i + 1}`, pos: [...(c.pos ?? map.charms.find((m) => m.id === c.id)?.pos ?? [0, 0, 0])],
    available: c.available ?? true, respawn: c.respawn_ticks ?? (c.available === false ? C.charm_respawn_ticks : 0),
  }));
  return w;
}

function newShade(id, pos, state) {
  return { id, pos: [pos[0], pos[1], pos[2]], state, left: state === 'spawning' ? C.shade_spawning_ticks : 0, push: 0, pushDir: [1, 0], evict: false, target: null, born: 0, lantern: null, drainTicks: 0 };
}

function spawnRandomMote(w, born) {
  const used = new Set(w.motes.filter((m) => m.point != null).map((m) => m.point));
  const free = w.map.motePoints.map((_, i) => i).filter((i) => !used.has(i));
  if (!free.length) return false;
  const i = free[Math.floor(w.rng() * free.length)];
  w.motes.push({ id: `M${w.nextMote++}`, pos: [...w.map.motePoints[i]], kind: 'random', ttl: null, born, point: i });
  return true;
}

export function timeLeft(w) { return Math.max(0, w.timeLeftTicks) / TPS; }
const ground = (w, x, z) => w.map.ground(x, z);

// ---------------------------------------------------------------------------------------------
export function step(w, input = {}, emit = () => {}) {
  if (w.state === 'won' || w.state === 'lost') return w;
  w.tick += 1;
  if (!w.started) { w.started = true; emit('night_start', { night: w.night }); } // TA: emitted in the first step (tick 1)
  const btn = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse, dash: !!input.dash, pause: !!input.pause };
  const pressed = (k) => btn[k] && !w.prev[k];
  const done = () => { w.prev = btn; return w; };

  // 1. Input; pause first.
  if (pressed('pause')) {
    if (w.state === 'paused') { w.state = 'playing'; emit('resumed', {}); }
    else { w.state = 'paused'; emit('paused', {}); return done(); }
  }
  if (w.state === 'paused') return done();
  w.sim += 1;
  const p = w.player, map = w.map;

  // 2. Timers.
  w.timeLeftTicks -= 1;
  if (p.dashCd > 0) p.dashCd--;
  if (p.pulseCd > 0) p.pulseCd--;
  if (p.invuln > 0) p.invuln--;
  if (p.charm > 0) p.charm--;
  for (const s of w.shades) if (s.left > 0) s.left--;
  for (const d of w.drifters) if (d.left > 0) d.left--;
  w.motes = w.motes.filter((m) => { if (m.ttl == null) return true; m.ttl--; return m.ttl > 0; });
  for (const c of w.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  for (const s of w.shades) {
    if (s.left === 0 && (s.state === 'stunned' || s.state === 'recoil' || s.state === 'spawning')) s.state = 'wander';
  }
  for (const d of w.drifters) if (d.state === 'flee' && d.left === 0) { d.state = 'removed'; d.stolen = 0; }
  updateWind(w);
  // 2b. Fuel (TICKET-03): decay 1/s + 5/s per draining shade; then lanterns with fuel <= 0 go out.
  for (const l of w.lanterns) if (l.lit) l.fuel -= 1;
  for (const s of [...w.shades].sort(byId)) {
    if (s.state !== 'drain') continue;
    const l = w.lanterns.find((x) => x.id === s.lantern);
    if (!l || !l.lit) continue;
    l.fuel -= T.drain_per_s;
    s.drainTicks += 1;
    if (s.drainTicks % C.fuel_drain_event_ticks === 0) emit('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: fuelOut(l) });
  }
  for (const l of w.lanterns) {
    if (l.lit && l.fuel <= 0) {
      l.lit = false; l.fuel = 0; l.deposited = 0; l.everLit = true;
      w.safeLit.delete(l.id);
      emit('lantern_out', { lantern_id: l.id });
    }
  }

  // 3. Player movement, then fall check.
  if (p.fallWait > 0) {
    p.fallWait--;
    if (p.fallWait === 0) {
      p.pos = [...map.start]; p.vel = [0, 0, 0]; p.grounded = true; p.launch = null; p.dash = 0;
      p.invuln = C.invuln_ticks;
    }
  } else {
    movePlayer(w, input, pressed, emit);
    if (p.pos[1] < C.fall_y) {
      p.flames -= 1;
      const lost = p.carried;
      p.carried = 0;
      emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
      if (p.flames > 0) { p.fallWait = C.fall_wait_ticks; p.vel = [0, 0, 0]; }
    }
  }
  const alive = p.flames > 0 && p.fallWait === 0;

  // 4. Pickup motes and charms.
  if (alive) {
    for (let i = 0; i < w.motes.length && p.carried < capacityOf(p); ) {
      const m = w.motes[i];
      if (m.born < w.sim && dxz(m.pos, p.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= C.height_tolerance) {
        w.motes.splice(i, 1);
        p.carried += 1;
        emit('mote_picked', { carried: p.carried });
      } else i++;
    }
    for (const c of w.charms) {
      if (c.available && dxz(c.pos, p.pos) <= T.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= C.height_tolerance) {
        c.available = false; c.respawn = C.charm_respawn_ticks; p.charm = C.charm_ticks;
        emit('charm_picked', { charm_id: c.id, charm_ticks: C.charm_ticks });
      }
    }
  }

  // 5. Lantern interaction (TICKET-03): unlit -> light/relight; lit & not full -> refuel. Full lanterns are not candidates.
  if (alive && pressed('interact') && p.carried > 0) {
    const refuelUsed = (l) => Math.min(p.carried, Math.ceil((FUEL_MAX - l.fuel) / (T.fuel_per_mote * FU)));
    let best = null, bd = Infinity;
    for (const l of w.lanterns) {
      if (l.lit && refuelUsed(l) === 0) continue;
      const d = dxz(l.pos, p.pos);
      if (d <= T.interact_radius && (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && byId(l, best) < 0))) { best = l; bd = d; }
    }
    if (best && best.lit) {
      const used = refuelUsed(best);
      p.carried -= used;
      best.fuel = Math.min(FUEL_MAX, best.fuel + used * T.fuel_per_mote * FU);
      w.score += C.score_per_mote * used;
      emit('refuel', { lantern_id: best.id, amount: used, fuel: fuelOut(best) });
    } else if (best) {
      const cost = best.everLit ? T.relight_cost : T.lantern_cost;
      const amount = Math.min(p.carried, cost - best.deposited);
      if (amount > 0) {
        p.carried -= amount;
        best.deposited += amount;
        w.score += C.score_per_mote * amount;
        emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        if (best.deposited >= cost) {
          const relight = best.everLit;
          best.lit = true; best.fuel = FUEL_MAX; best.everLit = true;
          if (relight) best.relitCount += 1;
          p.successfulLights += 1;
          w.score += relight ? C.score_relight : C.score_first_light;
          emit('lantern_lit', { lantern_id: best.id, relight });
        }
      }
    }
  }

  // 6. Safe zones: only lit lanterns with fuel >= 30. A lantern that (re)gains its zone (lit, or refuelled
  //    to >= 30) evicts shades inside within 30 ticks (no damage while evicting). Falling below 30 drops the zone.
  for (const l of w.lanterns) {
    if (!isSafe(l)) { w.safeLit.delete(l.id); continue; }
    if (w.safeLit.has(l.id)) continue;
    w.safeLit.add(l.id);
    for (const s of w.shades) if (dxz(s.pos, l.pos) < T.safe_radius) { s.evict = true; if (s.state === 'drain') s.state = 'wander'; }
  }

  // 7. Pulse.
  if (alive && pressed('pulse') && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
    p.carried -= T.pulse_cost;
    p.pulseCd = C.pulse_cd_ticks;
    const cx = p.pos[0], cy = p.pos[1] + C.pulse_center_dy, cz = p.pos[2];
    const ids = [];
    for (const s of [...w.shades].sort(byId)) {
      if (Math.hypot(s.pos[0] - cx, s.pos[1] - cy, s.pos[2] - cz) <= T.pulse_radius) {
        const d = dxz(s.pos, p.pos);
        w.score += s.state === 'drain' ? C.score_stun_drain : T.score.per_stun;
        s.lantern = null; s.drainTicks = 0;
        s.state = 'stunned'; s.left = C.stun_ticks; s.push = C.push_ticks;
        s.pushDir = d > 1e-9 ? [(s.pos[0] - cx) / d, (s.pos[2] - cz) / d] : [1, 0];
        ids.push(s.id);
      }
    }
    for (const d of w.drifters) {
      if (Math.hypot(d.pos[0] - cx, d.pos[1] - cy, d.pos[2] - cz) > T.pulse_radius) continue;
      if (d.state === 'chase') { d.state = 'flee'; d.left = C.drifter_flee_ticks; d.stoleOnce = true; }
      else if (d.state === 'flee' && d.stolen > 0) {
        const amount = d.stolen;
        const gy = ground(w, d.pos[0], d.pos[2]) ?? 0;
        for (let i = 0; i < amount; i++) w.motes.push({ id: `M${w.nextMote++}`, pos: [r3(d.pos[0]), gy, r3(d.pos[2])], kind: 'dropped', ttl: C.dropped_ttl_ticks, born: w.sim, point: null });
        d.stolen = 0; d.left = C.drifter_drop_flee_ticks;
        emit('drifter_drop', { drifter_id: d.id, amount });
      }
    }
    emit('pulse', { stunned_ids: ids });
  }

  // 8. Move shades and drifters.
  const speed = map.shadeSpeed * TICK_DT;
  for (const s of w.shades) {
    if (s.born >= w.sim) continue;
    if (s.evict) {
      const l = nearestLitContaining(w, s.pos);
      if (!l) { s.evict = false; }
      else {
        const d = dxz(s.pos, l.pos);
        const [ux, uz] = d > 1e-9 ? [(s.pos[0] - l.pos[0]) / d, (s.pos[2] - l.pos[2]) / d] : [1, 0];
        const nd = Math.min(T.safe_radius, d + T.safe_radius / C.safe_evict_ticks);
        s.pos[0] = l.pos[0] + ux * nd; s.pos[2] = l.pos[2] + uz * nd;
        if (nd >= T.safe_radius - 1e-9) s.evict = false;
        setShadeY(w, s);
        continue;
      }
    }
    if (s.state === 'stunned') {
      if (s.push > 0) {
        s.push--;
        tryMoveShade(w, s, s.pushDir[0] * (T.pulse_push_m / C.push_ticks), s.pushDir[1] * (T.pulse_push_m / C.push_ticks));
      }
      continue;
    }
    if (s.state === 'spawning') continue;
    if (s.state === 'recoil') {
      const d = dxz(s.pos, p.pos);
      const [ux, uz] = d > 1e-9 ? [(s.pos[0] - p.pos[0]) / d, (s.pos[2] - p.pos[2]) / d] : [1, 0];
      tryMoveShade(w, s, ux * (C.shade_recoil_m / C.shade_recoil_ticks), uz * (C.shade_recoil_m / C.shade_recoil_ticks));
      continue;
    }
    const d = dxz(s.pos, p.pos);
    if (s.state === 'drain') {
      const l = w.lanterns.find((x) => x.id === s.lantern);
      if (alive && d <= C.drain_break_dist) { s.state = 'chase'; s.lantern = null; s.drainTicks = 0; }
      else if (!l || !l.lit || l.fuel >= LOW_FUEL || dxz(s.pos, l.pos) > C.drain_dist) { s.state = 'wander'; s.lantern = null; s.drainTicks = 0; }
      else continue; // stands still while draining
    }
    if (alive && s.state === 'wander' && d <= C.shade_detect) s.state = 'chase';
    else if (s.state === 'chase' && (!alive || d > C.shade_lose)) s.state = 'wander';
    if (s.state === 'wander') {
      // TICKET-03: wander shades go for the nearest weak lantern (lit, fuel < 30; tie -> smaller id), else nearest unlit.
      const weak = nearestLantern(s.pos, w.lanterns.filter((l) => l.lit && l.fuel < LOW_FUEL));
      if (weak) {
        const ld = dxz(s.pos, weak.pos);
        if (ld <= C.drain_dist) { s.state = 'drain'; s.lantern = weak.id; s.drainTicks = 0; continue; }
        const st = Math.min(map.shadeSpeed * TICK_DT, ld);
        tryMoveShade(w, s, ((weak.pos[0] - s.pos[0]) / ld) * st, ((weak.pos[2] - s.pos[2]) / ld) * st);
        if (dxz(s.pos, weak.pos) <= C.drain_dist) { s.state = 'drain'; s.lantern = weak.id; s.drainTicks = 0; }
        continue;
      }
      const dark = nearestLantern(s.pos, w.lanterns.filter((l) => !l.lit));
      if (dark && dxz(s.pos, dark.pos) > C.drain_dist && (!s.target || s.targetDark !== dark.id)) { s.target = [...dark.pos]; s.targetDark = dark.id; }
    }
    if (s.state === 'chase') {
      if (d > 1e-9) { const st = Math.min(speed, d); tryMoveShade(w, s, ((p.pos[0] - s.pos[0]) / d) * st, ((p.pos[2] - s.pos[2]) / d) * st); }
    } else {
      if (!s.target || dxz(s.pos, s.target) < 0.5) s.target = randomPoint(w, s.pos, 8);
      const td = dxz(s.pos, s.target), st = Math.min(C.shade_wander_speed * TICK_DT, td);
      if (td > 1e-9) tryMoveShade(w, s, ((s.target[0] - s.pos[0]) / td) * st, ((s.target[2] - s.pos[2]) / td) * st);
    }
  }
  for (const d of w.drifters) {
    if (d.state === 'removed' || d.born >= w.sim) continue;
    const dist = dxz(d.pos, p.pos);
    if (d.state === 'idle' || d.state === 'chase') {
      const want = alive && !d.stoleOnce && p.carried >= C.drifter_trigger_carried && dist <= C.drifter_trigger_dist;
      d.state = want ? 'chase' : 'idle';
    }
    let vx = 0, vz = 0;
    if (d.state === 'chase' && dist > 1e-9) { const st = Math.min(C.drifter_speed * TICK_DT, dist); vx = ((p.pos[0] - d.pos[0]) / dist) * st; vz = ((p.pos[2] - d.pos[2]) / dist) * st; }
    else if (d.state === 'flee') { const [ux, uz] = dist > 1e-9 ? [(d.pos[0] - p.pos[0]) / dist, (d.pos[2] - p.pos[2]) / dist] : [1, 0]; vx = ux * C.drifter_speed * TICK_DT; vz = uz * C.drifter_speed * TICK_DT; }
    else if (d.state === 'idle') {
      if (!d.target || dxz(d.pos, d.target) < 0.5) d.target = randomPoint(w, d.pos, 10);
      const td = dxz(d.pos, d.target), st = Math.min(C.drifter_idle_speed * TICK_DT, td);
      if (td > 1e-9) { vx = ((d.target[0] - d.pos[0]) / td) * st; vz = ((d.target[2] - d.pos[2]) / td) * st; }
    }
    d.pos[0] += vx; d.pos[2] += vz;
    d.pos[1] = (ground(w, d.pos[0], d.pos[2]) ?? 0) + C.drifter_height;
  }

  // 9. Contact: drifters steal first, then shades hit (ascending id); at most one flame per tick.
  if (alive) {
    for (const d of [...w.drifters].sort(byId)) {
      if (d.state !== 'chase' || d.born >= w.sim || dxz(d.pos, p.pos) > C.drifter_touch) continue;
      const amount = Math.min(C.drifter_steal_max, p.carried);
      p.carried -= amount; d.stolen = amount; d.stoleOnce = true;
      d.state = 'flee'; d.left = C.drifter_flee_ticks;
      emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
    }
    for (const s of [...w.shades].sort(byId)) {
      if ((s.state !== 'chase' && s.state !== 'wander') || s.evict || s.born >= w.sim) continue;
      if (dxz(s.pos, p.pos) > T.shade_hit_radius || Math.abs(s.pos[1] - p.pos[1]) > C.height_tolerance) continue;
      if (p.invuln > 0) continue;
      p.flames -= 1;
      const dropped = Math.floor(p.carried / 2);
      p.carried -= dropped;
      for (let i = 0; i < dropped; i++) {
        const a = w.rng() * Math.PI * 2, r = C.drop_ring[0] + w.rng() * (C.drop_ring[1] - C.drop_ring[0]);
        const x = p.pos[0] + Math.cos(a) * r, z = p.pos[2] + Math.sin(a) * r;
        w.motes.push({ id: `M${w.nextMote++}`, pos: [r3(x), ground(w, x, z) ?? 0, r3(z)], kind: 'dropped', ttl: C.dropped_ttl_ticks, born: w.sim, point: null });
      }
      p.invuln = C.invuln_ticks;
      s.state = 'recoil'; s.left = C.shade_recoil_ticks;
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      break;
    }
  }

  // 10. Spawning by schedule (new entities interact from the next tick).
  if (w.randomMotes && w.sim % C.mote_every_ticks === 0 && w.motes.length < C.mote_cap) spawnRandomMote(w, w.sim);
  if (w.randomShades && w.sim >= 300 && (w.sim - 300) % map.shadeEvery === 0) {
    const n = w.sim === 300 ? 2 : 1;
    for (let i = 0; i < n && w.shades.length < map.shadeMax; i++) {
      const occupied = new Set(w.shades.map((s) => s.spawnPoint).filter((x) => x != null));
      const valid = map.shadePoints.map((pt, idx) => ({ pt, idx })).filter(({ pt, idx }) => dxz(pt, p.pos) >= C.shade_spawn_min_dist && !(w.sim === 300 && occupied.has(idx)));
      if (!valid.length) break;
      const { pt, idx } = valid[Math.floor(w.rng() * valid.length)];
      const s = newShade(`S${w.nextShade++}`, [pt[0], (ground(w, pt[0], pt[2]) ?? 0) + C.shade_height, pt[2]], 'spawning');
      s.born = w.sim; s.spawnPoint = idx;
      w.shades.push(s);
      emit('shade_spawned', { id: s.id });
    }
  }
  if (w.randomDrifters && w.sim % C.drifter_every_ticks === 0 && w.drifters.filter((d) => d.state !== 'removed').length < C.drifter_max) {
    const pts = map.shadePoints;
    const pt = pts[Math.floor(w.rng() * pts.length)];
    w.drifters.push({ id: `D${w.nextDrifter++}`, pos: [pt[0], (ground(w, pt[0], pt[2]) ?? 0) + C.drifter_height, pt[2]], state: 'idle', stolen: 0, left: 0, stoleOnce: false, target: null, born: w.sim });
  }

  // 11. Win / lose.
  // TICKET-03: no early win. At dawn: survive with >= ceil(0.6 * lanterns) lit -> won/dawn_survived.
  if (p.flames <= 0) endGame(w, 'lost', 'no_flames', emit);
  else if (w.timeLeftTicks <= 0) {
    const lit = w.lanterns.filter((l) => l.lit).length;
    if (lit >= Math.ceil(T.win_ratio * w.lanterns.length)) endGame(w, 'won', 'dawn_survived', emit);
    else endGame(w, 'lost', 'dawn', emit);
  }
  return done();
}

function endGame(w, result, reason, emit) {
  w.state = result;
  w.result = { result, reason };
  if (result === 'won') {
    for (const l of w.lanterns) if (l.lit) w.score += C.score_dawn_per_lit + Math.floor(l.fuel / FU);
    w.score += T.score.per_flame_left * w.player.flames;
  }
  emit('game_over', { result, reason });
}

function updateWind(w) {
  const wd = w.wind;
  if (!w.windEnabled) { wd.active = false; return; }
  if (wd.active && --wd.left <= 0) wd.active = false;
  if ((w.sim + C.wind_warn_ticks) % C.wind_every_ticks === 0) wd.pendingDir = Math.floor(w.rng() * 360); // warning (visual only)
  if (w.sim > 0 && w.sim % C.wind_every_ticks === 0) {
    wd.active = true; wd.left = C.wind_len_ticks;
    wd.dir = wd.pendingDir ?? Math.floor(w.rng() * 360); wd.pendingDir = null;
  }
}

function movePlayer(w, input, pressed, emit) {
  const p = w.player, map = w.map;
  let [mx, mz] = input.move ?? [0, 0];
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const moving = Math.hypot(wx, wz) > 1e-9;
  if (moving) { const l = Math.hypot(wx, wz); p.facing = [wx / l, wz / l]; }

  // Jump (only when grounded).
  if (pressed('jump') && p.grounded && p.dash === 0) { p.vel[1] = C.jump_velocity; p.grounded = false; }
  // Dash: cooldown from start; charm removes cooldown; pressing while dashing is ignored.
  if (pressed('dash') && p.dash === 0 && (p.dashCd === 0 || p.charm > 0)) {
    p.dash = C.dash_ticks;
    p.dashDir = moving ? [wx / Math.hypot(wx, wz), wz / Math.hypot(wx, wz)] : [...p.facing];
    p.dashCd = p.charm > 0 ? 0 : C.dash_cd_ticks;
    emit('dash', {});
  }

  let vx, vz;
  const dashing = p.dash > 0;
  if (dashing) {
    p.dash--;
    vx = p.dashDir[0] * T.dash_speed; vz = p.dashDir[1] * T.dash_speed;
    if (!p.grounded) p.vel[1] = 0; // keep altitude while air-dashing
  } else if (p.launch) {
    [vx, vz] = p.launch;
  } else {
    const sp = p.charm > 0 ? C.charm_speed : T.player_speed;
    vx = wx * sp; vz = wz * sp;
  }
  p.vel[0] = vx; p.vel[2] = vz;
  let ex = vx, ez = vz;
  if (w.wind.active) { const a = (w.wind.dir * Math.PI) / 180; ex += Math.cos(a) * C.wind_speed; ez += Math.sin(a) * C.wind_speed; }

  // Horizontal move with walls (higher ground than feet is a wall; small steps allowed for ramps).
  const nx = p.pos[0] + ex * TICK_DT, nz = p.pos[2] + ez * TICK_DT;
  const tryXZ = (x, z) => {
    if (map.obstacle(x, z)) return false;
    const g = map.ground(x, z);
    return g === null || g <= p.pos[1] + 0.35;
  };
  if (tryXZ(nx, nz)) { p.pos[0] = nx; p.pos[2] = nz; }
  else if (tryXZ(nx, p.pos[2])) p.pos[0] = nx;
  else if (tryXZ(p.pos[0], nz)) p.pos[2] = nz;

  // Vertical.
  const g = map.ground(p.pos[0], p.pos[2]);
  const airDash = dashing && !p.grounded;
  if (p.grounded) {
    // Stay glued to ground incl. ramps; a drop larger than a ramp step (tier edge / sea) starts a fall.
    if (g !== null && g >= p.pos[1] - 0.35) { p.pos[1] = g; p.vel[1] = 0; }
    else p.grounded = false;
  }
  if (!p.grounded && !airDash) {
    p.vel[1] -= C.gravity * TICK_DT;
    p.pos[1] += p.vel[1] * TICK_DT;
    if (g !== null && p.pos[1] <= g && p.vel[1] <= 0) { p.pos[1] = g; p.vel[1] = 0; p.grounded = true; p.launch = null; }
  }

  // Jump pads: feet touch pad -> launch.
  if (p.grounded) {
    for (const pad of map.pads) {
      if (dxz(pad.pos, p.pos) <= 1 && Math.abs(p.pos[1] - pad.pos[1]) < 0.05) {
        let dir = pad.dir;
        if (pad.toward) { const dx = pad.toward[0] - pad.pos[0], dz = pad.toward[1] - pad.pos[2], l = Math.hypot(dx, dz); dir = [dx / l, dz / l]; }
        p.launch = [dir[0] * pad.speed, dir[1] * pad.speed];
        p.vel = [p.launch[0], pad.vy, p.launch[1]];
        p.grounded = false;
        break;
      }
    }
  }
}

function nearestLantern(pos, list) {
  let best = null, bd = Infinity;
  for (const l of list) { const d = dxz(pos, l.pos); if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && byId(l, best) < 0)) { best = l; bd = d; } }
  return best;
}
const fuelOut = (l) => Math.round((l.fuel / FU) * 10) / 10 + 0;

function setShadeY(w, s) { s.pos[1] = (w.map.ground(s.pos[0], s.pos[2]) ?? 0) + C.shade_height; }

function nearestLitContaining(w, pos) {
  let best = null, bd = Infinity;
  for (const l of w.lanterns) { if (!isSafe(l)) continue; const d = dxz(pos, l.pos); if (d < T.safe_radius && d < bd) { best = l; bd = d; } }
  return best;
}

// Move a shade; lit-lantern safe zones and the bell tower are obstacles (blocked at the edge).
function tryMoveShade(w, s, dx, dz) {
  let x = s.pos[0] + dx, z = s.pos[2] + dz;
  for (const l of w.lanterns) {
    if (!isSafe(l)) continue;
    const d = Math.hypot(x - l.pos[0], z - l.pos[2]);
    if (d < T.safe_radius) {
      const [ux, uz] = d > 1e-9 ? [(x - l.pos[0]) / d, (z - l.pos[2]) / d] : [1, 0];
      x = l.pos[0] + ux * T.safe_radius; z = l.pos[2] + uz * T.safe_radius;
    }
  }
  if (w.map.obstacle(x, z)) return;
  s.pos[0] = x; s.pos[2] = z;
  setShadeY(w, s);
}

function randomPoint(w, from, r) {
  const a = w.rng() * Math.PI * 2, d = w.rng() * r;
  return [from[0] + Math.cos(a) * d, 0, from[2] + Math.sin(a) * d];
}

const sec = (t) => r3(t / TPS);
export function snapshot(w) {
  const v = (a) => a.map(r3);
  const p = w.player;
  return {
    type: 'snapshot', tick: w.tick, sim_tick: w.sim, night: w.night, state: w.state,
    time_left_s: r3(timeLeft(w)), score: w.score,
    wind: { active: w.wind.active, dir_deg: w.wind.active ? w.wind.dir : null },
    player: {
      pos: v(p.pos), vel: v(p.vel), grounded: p.grounded, flames: p.flames, carried: p.carried, capacity: capacityOf(p),
      invuln: p.invuln > 0, dash_cd_s: sec(p.dashCd), pulse_cd_s: sec(p.pulseCd), charm_s: sec(p.charm),
    },
    lanterns: w.lanterns.map((l) => ({ id: l.id, pos: v(l.pos), lit: l.lit, deposited: l.deposited, fuel: fuelOut(l), ever_lit: l.everLit, relit_count: l.relitCount })),
    shades: w.shades.map((s) => ({ id: s.id, pos: v(s.pos), state: s.state })),
    motes_active: w.motes.length,
    motes: w.motes.map((m) => ({ id: m.id, pos: v(m.pos), kind: m.kind, ttl_s: m.ttl == null ? null : sec(m.ttl) })),
    drifters: w.drifters.map((d) => ({ id: d.id, pos: v(d.pos), state: d.state, stolen: d.stolen })),
    charms: w.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: sec(c.available ? 0 : c.respawn) })),
  };
}

export { SHADE_STATES, capacityOf };
