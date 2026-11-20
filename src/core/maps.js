// Standard maps from TICKET-02 Part 2. Angles from +X, CCW seen from above: (r cos a, y, r sin a).
const rad = (d) => (d * Math.PI) / 180;
const r3 = (v) => Math.round(v * 1000) / 1000 + 0;
const ring = (r, degs, y = 0, cx = 0) => degs.map((d) => [r3(cx + r * Math.cos(rad(d))), y, r3(r * Math.sin(rad(d)))]);
const steps = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);
const lanterns = (list) => list.map((pos, i) => ({ id: `L${i + 1}`, pos }));

const night1 = {
  night: 1, name: 'Đảo Bến', duration: 300, shadeSpeed: 4.0,
  start: [0, 0, 0],
  lanterns: lanterns([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
  motePoints: [...ring(12, steps(0, 45, 8)), ...ring(33, steps(0, 22.5, 16))],
  shadePoints: ring(37, steps(15, 30, 12)),
  shadeEvery: 480, shadeMax: 6,
  pads: [], charms: [], drifters: false, wind: false,
  ground(x, z) { return Math.hypot(x, z) <= 40 ? 0 : null; },
  obstacle() { return false; },
};

const night2 = {
  night: 2, name: 'Đảo Cau', duration: 330, shadeSpeed: 4.0,
  start: [0, 0, 0],
  lanterns: lanterns([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
  motePoints: [0, 70].flatMap((cx) => [...ring(10, steps(0, 90, 4), 0, cx), ...ring(22, steps(0, 45, 8), 0, cx)]),
  shadePoints: [0, 70].flatMap((cx) => ring(26, steps(22.5, 45, 8), 0, cx)),
  shadeEvery: 420, shadeMax: 8,
  pads: [{ pos: [20, 0, 18], vy: 14, toward: [70, 0], speed: 24 }, { pos: [50, 0, -18], vy: 14, toward: [0, 0], speed: 24 }],
  charms: [{ id: 'C1', pos: [35, 0, 0] }], drifters: true, wind: false,
  ground(x, z) {
    if (Math.hypot(x, z) <= 28 || Math.hypot(x - 70, z) <= 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
    return null;
  },
  obstacle() { return false; },
};

function rampHeight(x, z) {
  for (const a of [30, 150]) {
    const ux = Math.cos(rad(a)), uz = Math.sin(rad(a));
    const along = x * ux + z * uz, perp = Math.abs(-x * uz + z * ux);
    if (perp <= 1.5 && along >= 24 && along <= 30) return (3 * (30 - along)) / 6;
  }
  return null;
}
const night3 = {
  night: 3, name: 'Đảo Chuông', duration: 360, shadeSpeed: 4.5,
  start: [0, 0, -30], // ASSUMPTION: (0,0,0) is inside the bell tower on Night 3
  lanterns: lanterns([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
  motePoints: [...ring(34, steps(0, 20, 18), 0), ...ring(18, steps(20, 20, 8), 3), ...ring(5, [45, 135, 225, 315], 6)],
  shadePoints: ring(43, steps(0, 22.5, 16)),
  shadeEvery: 360, shadeMax: 10,
  pads: [{ pos: [0, 3, 13], vy: 12, dir: [0, -1], speed: 8 }],
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }], drifters: true, wind: true,
  ground(x, z) {
    const r = Math.hypot(x, z);
    if (r > 45) return null;
    if (r <= 8) return 6;
    if (r >= 12 && r <= 24 && z > 0) return 3;
    const ramp = rampHeight(x, z);
    return ramp ?? 0;
  },
  obstacle(x, z) { return Math.hypot(x, z) < 2; }, // bell tower, radius 2, 8 m tall
};

export const MAPS = { 1: night1, 2: night2, 3: night3 };
