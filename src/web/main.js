// Rendering + input only. All rules live in src/core (shared with headless).
import * as THREE from 'three';
import { createWorld, step, timeLeft, TICK_DT } from '../core/world.js';
import { TUNING as T, WORLD } from '../core/tuning.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f1a);
scene.fog = new THREE.FogExp2(0x1a1030, 0.035);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
const hemi = new THREE.HemisphereLight(0x6a5acd, 0x0a0a14, 0.35);
scene.add(hemi);

// Island + cloud sea
const island = new THREE.Mesh(new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius - 4, 2, 64), new THREE.MeshStandardMaterial({ color: 0x2c3e33 }));
island.position.y = -1;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(150, 48), new THREE.MeshStandardMaterial({ color: 0x241a3a }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -3;
scene.add(sea);

// Player: Mây with conical hat (nón lá) and a small hanging lantern
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7), new THREE.MeshStandardMaterial({ color: 0x5b8fd6 }));
body.position.y = 0.7;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.45, 24), new THREE.MeshStandardMaterial({ color: 0xe8d29a }));
hat.position.y = 1.55;
const miniLantern = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffb347 }));
miniLantern.position.set(0.6, 1.2, 0);
const playerLight = new THREE.PointLight(0xffb347, 6, 9);
playerLight.position.set(0, 1.6, 0);
player.add(body, hat, miniLantern, playerLight);
scene.add(player);

const lanternMeshes = new Map(), moteMeshes = new Map(), shadeMeshes = new Map();
const moteGeo = new THREE.SphereGeometry(0.15), moteMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
const shadeGeo = new THREE.SphereGeometry(0.8, 16, 12);

function lanternMesh(l) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3), new THREE.MeshStandardMaterial({ color: 0x5a3b22 }));
  pole.position.y = 1.5;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshStandardMaterial({ color: 0x553322, emissive: 0x000000 }));
  lamp.position.y = 3.4;
  const light = new THREE.PointLight(0xff9a3c, 0, 18);
  light.position.y = 3.4;
  g.add(pole, lamp, light);
  g.position.set(l.pos[0], 0, l.pos[2]);
  g.userData = { lamp, light };
  scene.add(g);
  return g;
}

function sync(map, items, make) {
  const seen = new Set();
  for (const it of items) {
    seen.add(it.id);
    if (!map.has(it.id)) map.set(it.id, make(it));
  }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m); map.delete(id); }
}

// Input
const keys = new Set();
addEventListener('keydown', (e) => { keys.add(e.code); if (e.code === 'KeyR') restart(); });
addEventListener('keyup', (e) => keys.delete(e.code));
let yaw = 0, dragging = false, lastX = 0;
addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; });
addEventListener('mouseup', () => (dragging = false));
addEventListener('mousemove', (e) => { if (dragging) { yaw -= (e.clientX - lastX) * 0.3; lastX = e.clientX; } });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

let world;
const hud = document.getElementById('hud'), msg = document.getElementById('msg');
function restart() {
  for (const m of [...lanternMeshes.values(), ...moteMeshes.values(), ...shadeMeshes.values()]) scene.remove(m);
  lanternMeshes.clear(); moteMeshes.clear(); shadeMeshes.clear();
  world = createWorld({ seed: (Math.random() * 1e9) | 0 });
  for (const l of world.lanterns) lanternMeshes.set(l.id, lanternMesh(l));
  msg.style.display = 'none';
}
restart();

let acc = 0, last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now; acc += dt;
  if (keys.has('ArrowLeft')) yaw += 90 * dt;
  if (keys.has('ArrowRight')) yaw -= 90 * dt;
  const input = {
    move: [(keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0), (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)],
    cam_yaw_deg: yaw, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyF'),
  };
  while (acc >= TICK_DT) { step(world, input); acc -= TICK_DT; }
  render(now / 1000);
});

function render(t) {
  const p = world.player;
  player.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const th = (yaw * Math.PI) / 180, fx = Math.sin(th), fz = Math.cos(th);
  player.rotation.y = th;
  player.visible = !(p.invuln > 0 && Math.floor(t * 12) % 2);
  playerLight.intensity = 3 + p.carried * 1.5;
  camera.position.set(p.pos[0] - fx * 8, p.pos[1] + 5, p.pos[2] - fz * 8);
  camera.lookAt(p.pos[0], p.pos[1] + 1.2, p.pos[2]);

  let litCount = 0;
  for (const l of world.lanterns) {
    const m = lanternMeshes.get(l.id);
    const frac = l.deposited / T.lantern_cost;
    m.userData.lamp.material.emissive.setHex(l.lit ? 0xff9a3c : 0x331a08);
    m.userData.lamp.material.emissiveIntensity = l.lit ? 1.5 : 0.3 + frac;
    m.userData.light.intensity = l.lit ? 40 : frac * 8;
    if (l.lit) litCount++;
  }
  hemi.intensity = 0.35 + litCount * 0.12; // the island brightens as lanterns are lit

  sync(moteMeshes, world.motes, (mo) => { const m = new THREE.Mesh(moteGeo, moteMat); m.position.set(mo.pos[0], 0, mo.pos[2]); scene.add(m); return m; });
  for (const mo of world.motes) moteMeshes.get(mo.id).position.y = 0.8 + Math.sin(t * 3 + mo.pos[0]) * 0.2;
  sync(shadeMeshes, world.shades, () => { const m = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: 0x2a0a3a, emissive: 0x3a0060, transparent: true, opacity: 0.85 })); scene.add(m); return m; });
  for (const s of world.shades) {
    const m = shadeMeshes.get(s.id);
    m.position.set(s.pos[0], s.pos[1] + Math.sin(t * 4) * 0.1, s.pos[2]);
    m.material.opacity = s.state === 'stunned' ? 0.35 : 0.85;
  }

  const tl = timeLeft(world);
  hud.innerHTML = `🏮 Đèn: ${litCount}/${world.lanterns.length} &nbsp; ✨ Mang: ${p.carried}/${T.carry_capacity}<br>` +
    `🔥 Lửa: ${'●'.repeat(Math.max(0, p.flames))} &nbsp; ⏳ ${Math.floor(tl / 60)}:${String(Math.floor(tl % 60)).padStart(2, '0')}<br>` +
    `⭐ Điểm: ${world.score} &nbsp; Tỏa sáng: ${p.pulseCd > 0 ? 'đang hồi' : p.carried >= T.pulse_cost ? 'sẵn sàng' : 'thiếu ánh sáng'}`;
  if (world.state !== 'playing') {
    msg.style.display = 'flex';
    const why = { all_lit: 'Đảo Bến đã sáng trở lại!', dawn: 'Trời đã sáng trước khi thắp xong đèn.', no_flames: 'Mây đã hết lửa.' }[world.result.reason];
    msg.innerHTML = `${world.state === 'won' ? 'Thắng!' : 'Thua'}<small>${why} Điểm: ${world.score}<br>Nhấn R để chơi lại</small>`;
  }
}
