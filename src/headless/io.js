// Validation + input timeline for headless files (Test Contract v1.0, sections C and D).
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];

export function validateInputs(inp) {
  if (!isObj(inp) || !Array.isArray(inp.frames)) return 'expected {"frames": [...]}';
  let last = -1;
  for (const [i, f] of inp.frames.entries()) {
    if (!isObj(f)) return `frame ${i} is not an object`;
    if (!Number.isInteger(f.tick) || f.tick < 0) return `frame ${i}: tick must be a non-negative integer`;
    if (f.tick <= last) return `frame ${i}: ticks must strictly increase`;
    last = f.tick;
    if ('move' in f && !(Array.isArray(f.move) && f.move.length === 2 && f.move.every((v) => isNum(v) && v >= -1 && v <= 1)))
      return `frame ${i}: move must be [x, z] with values in [-1, 1]`;
    if ('cam_yaw_deg' in f && !isNum(f.cam_yaw_deg)) return `frame ${i}: cam_yaw_deg must be a number`;
    for (const b of BUTTONS) if (b in f && typeof f[b] !== 'boolean') return `frame ${i}: ${b} must be boolean`;
  }
  return null;
}

export function validateScenario(sc) {
  if (!isObj(sc)) return 'scenario must be an object';
  if ('player' in sc) {
    const p = sc.player;
    if (!isObj(p)) return 'player must be an object';
    if ('pos' in p && !isVec3(p.pos)) return 'player.pos must be [x,y,z]';
    for (const k of ['carried', 'flames']) if (k in p && !(Number.isInteger(p[k]) && p[k] >= 0)) return `player.${k} must be a non-negative integer`;
  }
  for (const k of ['random_motes', 'random_shades']) if (k in sc && typeof sc[k] !== 'boolean') return `${k} must be boolean`;
  if ('motes' in sc && !(Array.isArray(sc.motes) && sc.motes.every(isVec3))) return 'motes must be a list of [x,y,z]';
  if ('shades' in sc) {
    if (!Array.isArray(sc.shades)) return 'shades must be a list';
    for (const s of sc.shades) {
      if (!isObj(s) || !isVec3(s.pos)) return 'each shade needs pos [x,y,z]';
      if ('id' in s && typeof s.id !== 'string') return 'shade id must be a string';
    }
  }
  if ('lanterns' in sc) {
    if (!Array.isArray(sc.lanterns)) return 'lanterns must be a list';
    for (const l of sc.lanterns) {
      if (!isObj(l) || typeof l.id !== 'string') return 'each lantern needs a string id';
      if ('pos' in l && !isVec3(l.pos)) return `lantern ${l.id}: pos must be [x,y,z]`;
      if ('lit' in l && typeof l.lit !== 'boolean') return `lantern ${l.id}: lit must be boolean`;
      if ('deposited' in l && !(Number.isInteger(l.deposited) && l.deposited >= 0)) return `lantern ${l.id}: deposited must be a non-negative integer`;
    }
  }
  if ('time_left_s' in sc && !(isNum(sc.time_left_s) && sc.time_left_s > 0)) return 'time_left_s must be a positive number';
  return null;
}

// Fields persist until a later frame changes them. Defaults: move [0,0], yaw 0, buttons false.
export class InputTimeline {
  constructor(frames) { this.frames = frames; this.i = 0; this.cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false }; }
  at(tick) {
    while (this.i < this.frames.length && this.frames[this.i].tick <= tick) {
      const f = this.frames[this.i++];
      for (const k of Object.keys(this.cur)) if (k in f) this.cur[k] = k === 'move' ? [...f.move] : f[k];
    }
    return this.cur;
  }
}
