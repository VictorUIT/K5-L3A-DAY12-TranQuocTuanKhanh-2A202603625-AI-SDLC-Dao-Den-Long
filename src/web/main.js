// Rendering, UI, audio and input only. All game rules live in src/core (shared with headless).
import * as THREE from 'three';
import { createWorld, step, timeLeft, TICK_DT } from '../core/world.js';
import { TUNING as T, C } from '../core/tuning.js';
import { MAPS } from '../core/maps.js';
import { createAudio } from './audio.js';
import { validateName, addEntry, sortEntries, isoWithOffset } from '../core/leaderboard.js';
const params = new URLSearchParams(location.search);
const BENCH = params.has('bench');

// ---------- Palette (TICKET-02 Part 3) ----------
const COL = {
  sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lampOn: 0xffb347, lampCore: 0xffe9b0, lampOff: 0x5b5f6e, moteCore: 0xfff6c2, moteHalo: 0xffe58a,
  shadeBody: 0x120a1a, shadeRim: 0x7a3cff, shadeStun: 0x3a3450, shirt: 0xe8e2d0, scarf: 0xc8102e,
  gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const INTRO = {
  1: 'Ông Đăng: "Sương đen đã nuốt Đảo Bến. Đèn cạn dầu rất nhanh: thắp đèn, châm dầu, giữ ít nhất ba ngọn sáng tới bình minh nhé."',
  2: 'Ông Đăng: "Đảo Cau có hai nửa. Đi qua cầu tre hoặc nhảy bục để sang đảo kia. Coi chừng Gió Lạc cướp đom đóm!"',
  3: 'Ông Đăng: "Đảo Chuông cao ba tầng, gió mạnh thổi từng cơn. Leo dốc, nhảy bục, thắp đèn trên đỉnh chuông."',
};

// ---------- Settings (persisted) ----------
const DEFAULT_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyF', pause: 'Escape' };
const KEY_LABEL = { up: 'Đi lên', down: 'Đi xuống', left: 'Sang trái', right: 'Sang phải', jump: 'Nhảy', dash: 'Lướt', interact: 'Tương tác', pulse: 'Tỏa Sáng', pause: 'Tạm dừng' };
const settings = { volume: 0.6, sens: 1, colorblind: false, reduceMotion: false, bigText: false, keys: { ...DEFAULT_KEYS } };
try { const saved = JSON.parse(localStorage.getItem('ddl-settings') || '{}'); Object.assign(settings, saved, { keys: { ...DEFAULT_KEYS, ...(saved.keys || {}) } }); } catch (e) { /* storage unavailable */ }
const saveSettings = () => { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } };
const audio = createAudio(() => settings.volume);

// ---------- Three.js setup ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.sky);
scene.fog = new THREE.Fog(COL.fog, 25, 95);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
const ambient = new THREE.AmbientLight(0x9aa6ff, 0.15);
const moon = new THREE.DirectionalLight(0x8090ff, 0.35);
moon.position.set(-30, 60, 20);
scene.add(ambient, moon);
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });

let level = new THREE.Group();
scene.add(level);

function buildLevel(night) {
  scene.remove(level);
  level = new THREE.Group();
  const sea = new THREE.Mesh(new THREE.CircleGeometry(260, 48), std(COL.sea));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -12;
  level.add(sea);
  const disc = (r, h, x, z, y0 = 0, color = COL.grass) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), std(color));
    m.position.set(x, y0 - h / 2, z); level.add(m);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.4, r - 2, 3, 64), std(COL.sand));
    if (y0 === 0) { rim.position.set(x, -h - 1.5, z); level.add(rim); }
    return m;
  };
  if (night === 1) disc(40, 2, 0, 0);
  if (night === 2) {
    disc(28, 2, 0, 0); disc(28, 2, 70, 0);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), std(COL.wood));
    bridge.position.set(35, -0.15, 0); level.add(bridge);
  }
  if (night === 3) {
    disc(45, 2, 0, 0);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 24, 0, -Math.PI, true);
    shape.absarc(0, 0, 12, -Math.PI, 0, false);
    const tier1 = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false, curveSegments: 32 }), std(COL.grass));
    tier1.rotation.x = -Math.PI / 2; level.add(tier1);
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), std(COL.grass));
    tier2.position.y = 3; level.add(tier2);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), std(COL.wood));
    tower.position.y = 10; level.add(tower);
    const bell = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.8, 16), std(COL.gold, { metalness: 0.6 }));
    bell.position.y = 15; level.add(bell);
    for (const a of [30, 150]) {
      const r = (a * Math.PI) / 180;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.3, 3), std(COL.sand));
      ramp.position.set(27 * Math.cos(r), 1.5, 27 * Math.sin(r));
      ramp.rotation.order = 'YXZ';
      ramp.rotation.y = -r; ramp.rotation.z = Math.atan2(3, 6);
      level.add(ramp);
    }
  }
  for (const pad of MAPS[night].pads) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 24), std(COL.gold, { emissive: COL.gold, emissiveIntensity: 0.4 }));
    m.position.set(pad.pos[0], pad.pos[1] + 0.1, pad.pos[2]); level.add(m);
  }
  scene.add(level);
}

// Player: Mây with nón lá, red scarf and a little lantern.
const player = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7), std(COL.shirt));
body.position.y = 0.7;
const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), std(COL.scarf));
scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.2;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24), std(COL.sand));
hat.position.y = 1.62;
const mini = new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshBasicMaterial({ color: COL.lampOn }));
mini.position.set(0.65, 1.25, 0);
const pLight = new THREE.PointLight(COL.lampOn, 6, 10);
pLight.position.y = 1.6;
player.add(body, scarf, hat, mini, pLight);
scene.add(player);

const maps = { lantern: new Map(), mote: new Map(), shade: new Map(), drifter: new Map(), charm: new Map() };
const moteGeo = new THREE.SphereGeometry(0.14, 8, 6), haloGeo = new THREE.SphereGeometry(0.3, 8, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: COL.moteCore });
const haloMat = new THREE.MeshBasicMaterial({ color: COL.moteHalo, transparent: true, opacity: 0.35 });
const shadeGeo = new THREE.SphereGeometry(0.8, 14, 10), rimGeo = new THREE.SphereGeometry(0.88, 14, 10);
const drifterGeo = new THREE.TorusKnotGeometry(0.5, 0.08, 48, 6);
const charmGeo = new THREE.BoxGeometry(0.5, 0.7, 0.05);

const make = {
  lantern(l) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3), std(COL.wood));
    pole.position.y = 1.5;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), std(COL.lampOff, { emissive: 0x000000 }));
    lamp.position.y = 3.4;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: COL.lampCore }));
    core.position.y = 3.4; core.visible = false;
    const light = new THREE.PointLight(COL.lampOn, 0, 20);
    light.position.y = 3.4;
    // Torn paper strip: visible only when the lantern is out (shape cue, not colour).
    const tear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 1.25), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    tear.position.y = 3.4; tear.rotation.z = 0.5;
    // Fuel bar above lit lanterns.
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide }));
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.18), new THREE.MeshBasicMaterial({ color: COL.lampOn, side: THREE.DoubleSide }));
    barBg.position.y = bar.position.y = 4.4;
    g.add(pole, lamp, core, light, tear, barBg, bar);
    g.position.set(...l.pos);
    g.userData = { lamp, core, light, tear, bar, barBg };
    return g;
  },
  mote(m) { const g = new THREE.Group(); g.add(new THREE.Mesh(moteGeo, moteMat), new THREE.Mesh(haloGeo, haloMat)); g.userData.seed = m.pos[0] * 7 + m.pos[2]; return g; },
  shade() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(shadeGeo, std(COL.shadeBody, { emissive: 0x05020a }));
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color: COL.shadeRim, transparent: true, opacity: 0.35, side: THREE.BackSide }));
    g.add(b, rim); g.userData = { b, rim };
    return g;
  },
  drifter() { return new THREE.Mesh(drifterGeo, std(COL.drifter, { emissive: 0x1a2430 })); },
  charm(c) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(charmGeo, std(COL.scarf, { emissive: 0x400010 }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(charmGeo), new THREE.LineBasicMaterial({ color: COL.gold }));
    g.add(m, edge); g.position.set(c.pos[0], c.pos[1] + 1, c.pos[2]);
    return g;
  },
};
function sync(kind, items) {
  const map = maps[kind], seen = new Set();
  for (const it of items) {
    seen.add(it.id);
    if (!map.has(it.id)) { const m = make[kind](it); map.set(it.id, m); scene.add(m); }
  }
  for (const [id, m] of map) if (!seen.has(id)) { scene.remove(m); map.delete(id); }
}
const clearEntities = () => { for (const k in maps) sync(k, []); };

// ---------- FPS overlay (F3) for the >= 30 FPS @1280x720 requirement ----------
const fpsBox = document.createElement('div');
fpsBox.className = 'hidden';
fpsBox.style.cssText = 'position:fixed;bottom:8px;left:8px;font:13px monospace;background:#000a;padding:4px 8px;border-radius:6px;z-index:9';
document.body.appendChild(fpsBox);

// ---------- Input ----------
const keys = new Set();
let yaw = 0, dragging = false, lastX = 0, pendingPause = false, rebinding = null;
const K = (a) => keys.has(settings.keys[a]);
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (rebinding) { e.preventDefault(); rebinding(e.code); return; }
  if (e.code === settings.keys.pause && mode === 'play') pendingPause = true;
  if (e.code === 'F3') { e.preventDefault(); fpsBox.classList.toggle('hidden'); }
  audio.unlock();
});
addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; audio.unlock(); });
addEventListener('mouseup', () => (dragging = false));
addEventListener('mousemove', (e) => { if (dragging) { yaw -= (e.clientX - lastX) * 0.3 * settings.sens; lastX = e.clientX; } });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

// ---------- Game flow: menu -> intro -> play -> result -> next night -> dawn ----------
const $ = (id) => document.getElementById(id);
const screen = $('screen'), hud = $('hud');
let mode = 'menu', world = null, night = 1, totalScore = 0, wonScores = {}, lastCountdown = -1;

function show(html, buttons = []) {
  screen.innerHTML = html;
  for (const [label, fn] of buttons) { const b = document.createElement('button'); b.textContent = label; b.onclick = () => { audio.unlock(); fn(); }; screen.appendChild(b); }
}
function menu() {
  mode = 'menu'; hud.classList.add('hidden'); totalScore = 0; wonScores = {};
  show('<h1>Đảo Đèn Lồng</h1><p>Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.</p>',
    [['Bắt đầu', () => intro(1)], ['Bảng xếp hạng', () => boardScreen(menu)], ['Cài đặt', () => settingsScreen(menu)]]);
}
function intro(n) {
  mode = 'intro'; night = n; hud.classList.add('hidden');
  buildLevel(n); clearEntities();
  show(`<h2>Đêm ${n}</h2><h1>${MAPS[n].name}</h1><p>${INTRO[n]}</p>`, [['Vào đêm', () => startNight(n)]]);
}
function startNight(n) {
  night = n; runSeed = (Math.random() * 2 ** 31) | 0; world = createWorld({ seed: runSeed, night: n });
  yaw = 0; clearEntities(); mode = 'play'; screen.innerHTML = ''; hud.classList.remove('hidden');
  audio.music(true); lastCountdown = -1;
}
function result() {
  mode = 'result'; hud.classList.add('hidden'); audio.music(false);
  const won = world.state === 'won';
  audio.play(won ? 'win' : 'lose');
  const why = { dawn_survived: 'Đảo vẫn sáng khi bình minh lên!', dawn: 'Bình minh đến nhưng không đủ đèn còn sáng.', no_flames: 'Mây đã hết Ngọn Lửa.' }[world.result.reason];
  if (won) { wonScores[night] = world.score; totalScore = Object.values(wonScores).reduce((a, b) => a + b, 0); }
  if (won && night === 3) return show(`<h1>Bình Minh</h1><p>Ba hòn đảo đã sáng trở lại. Ông Đăng mỉm cười.</p><h2>Tổng điểm: ${totalScore}</h2>`, [['Lưu điểm', () => nameEntry(menu)], ['Về menu', menu]]);
  show(`<h1>${won ? 'Thắng!' : 'Thua'}</h1><p>${why}</p><h2>Điểm Đêm ${night}: ${won ? world.score : 0} · Tổng: ${totalScore}</h2>`,
    won ? [['Đêm kế tiếp', () => intro(night + 1)], ['Về menu', menu]] : [['Chơi lại Đêm này', () => startNight(night)], ['Lưu điểm', () => nameEntry(menu)], ['Về menu', menu]]);
}
function pauseScreen() {
  show('<h1>Tạm dừng</h1>', [['Tiếp tục', () => { pendingPause = true; }], ['Chơi lại Đêm', () => startNight(night)], ['Cài đặt', () => settingsScreen(pauseScreen)], ['Về menu', () => { audio.music(false); menu(); }]]);
}
function settingsScreen(back) {
  show(`<h1>Cài đặt</h1>
    <label>Âm lượng <input id="vol" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label>
    <label>Độ nhạy chuột <input id="sens" type="range" min="0.2" max="3" step="0.1" value="${settings.sens}"></label>
    <label><input id="cb" type="checkbox" ${settings.colorblind ? 'checked' : ''}> Bảng màu dễ phân biệt</label>
    <label><input id="rm" type="checkbox" ${settings.reduceMotion ? 'checked' : ''}> Giảm chuyển động (tắt rung camera, chớp màn hình)</label>
    <label><input id="bt" type="checkbox" ${settings.bigText ? 'checked' : ''}> Chữ lớn (×1.25)</label>`, [['Đổi phím', () => keysScreen(() => settingsScreen(back))], ['Xong', back]]);
  $('vol').oninput = (e) => { settings.volume = Number(e.target.value); saveSettings(); audio.setVolume(); };
  $('sens').oninput = (e) => { settings.sens = Number(e.target.value); saveSettings(); };
  $('cb').onchange = (e) => { settings.colorblind = e.target.checked; saveSettings(); };
  $('rm').onchange = (e) => { settings.reduceMotion = e.target.checked; saveSettings(); };
  $('bt').onchange = (e) => { settings.bigText = e.target.checked; saveSettings(); applyText(); };
}
const applyText = () => document.documentElement.classList.toggle('big', settings.bigText);
applyText();
function keysScreen(back, msg = '') {
  const dup = Object.entries(settings.keys).filter(([a, k]) => Object.entries(settings.keys).some(([b, k2]) => a !== b && k === k2)).map(([a]) => a);
  const rows = Object.keys(DEFAULT_KEYS).map((a) => `<tr><td>${KEY_LABEL[a]}</td><td><button data-a="${a}" class="${dup.includes(a) ? 'dup' : ''}">${settings.keys[a]}</button></td></tr>`).join('');
  show(`<h1>Đổi phím</h1><p>${msg || 'Bấm vào một phím để đổi, rồi nhấn phím mới.'}</p>${dup.length ? '<p class="warn">⚠ Có phím bị trùng (đánh dấu đỏ). Hãy đổi lại.</p>' : ''}<table class="keys">${rows}</table>`,
    [['Khôi phục mặc định', () => { settings.keys = { ...DEFAULT_KEYS }; saveSettings(); keysScreen(back, 'Đã khôi phục phím mặc định.'); }], ['Xong', back]]);
  for (const btn of screen.querySelectorAll('button[data-a]')) btn.onclick = () => {
    const a = btn.dataset.a; btn.textContent = '…nhấn phím';
    rebinding = (code) => {
      rebinding = null;
      const clash = Object.entries(settings.keys).find(([b, k]) => b !== a && k === code);
      settings.keys[a] = code; saveSettings();
      keysScreen(back, clash ? `⚠ Phím ${code} đang được dùng cho "${KEY_LABEL[clash[0]]}".` : `Đã gán ${code} cho "${KEY_LABEL[a]}".`);
    };
  };
}

// ---------- Leaderboard (on-disk via scripts/play.mjs; localStorage fallback under the vite dev server) ----------
let runSeed = 0;
async function loadBoard() {
  try { const r = await fetch('/api/leaderboard'); if (r.ok) return (await r.json()).entries; } catch (e) { /* no API */ }
  try { return sortEntries(JSON.parse(localStorage.getItem('ddl-leaderboard') || '[]')); } catch (e) { return []; }
}
async function saveBoard(entry) {
  try {
    const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    if (r.ok) return (await r.json()).entries;
  } catch (e) { /* no API */ }
  const entries = addEntry(await loadBoard(), entry);
  try { localStorage.setItem('ddl-leaderboard', JSON.stringify(entries)); } catch (e) { /* ignore */ }
  return entries;
}
async function boardScreen(back = menu) {
  const entries = await loadBoard();
  const rows = entries.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name.replace(/</g, '&lt;')}</td><td>${e.score}</td><td>${e.nights_won}/3</td></tr>`).join('') || '<tr><td colspan="4">Chưa có ai.</td></tr>';
  show(`<h1>Bảng xếp hạng</h1><table class="keys"><tr><th>#</th><th>Tên</th><th>Điểm</th><th>Đêm thắng</th></tr>${rows}</table>`, [['Về menu', back]]);
}
function nameEntry(after) {
  const nightsWon = Object.keys(wonScores).length;
  show(`<h1>Lưu điểm</h1><h2>Tổng điểm: ${totalScore} · Đêm thắng: ${nightsWon}/3</h2>
    <label>Tên (3–12 ký tự: chữ, số, _) <input id="nm" maxlength="12" autofocus></label><p id="nmErr" class="warn"></p>`,
    [['Lưu', async () => {
      const name = validateName($('nm').value);
      if (!name) { $('nmErr').textContent = '⚠ Tên phải dài 3–12 ký tự, chỉ gồm chữ, số hoặc _.'; return; }
      await saveBoard({ name, score: totalScore, nights_won: nightsWon, achieved_at: isoWithOffset(), seed: runSeed });
      boardScreen(after);
    }], ['Bỏ qua', after]]);
}

// ---------- Accessibility cues: subtitles + edge arrow for new shades, hit flash/shake ----------
const subs = [];
let shake = 0, flash = 0, spawnArrow = null;
function subtitle(text) { subs.push({ text, until: performance.now() + 3000 }); }
function onEvent(name, data) {
  if (name === 'shade_spawned') { subtitle('⚠ Bóng Mực xuất hiện'); const s = world.shades.find((x) => x.id === data.id); if (s) spawnArrow = { pos: s.pos, until: performance.now() + 3000 }; }
  if (name === 'player_hit') { shake = 0.4; flash = 0.3; }
  if (name === 'lantern_out') subtitle(`⚠ Đèn ${data.lantern_id} đã tắt`);
}

// ---------- Loop ----------
const SOUND_FOR = { mote_picked: 'pick', lantern_lit: 'lit', pulse: 'pulse', player_hit: 'hit', dash: 'dash', shade_spawned: 'spawn', charm_picked: 'charm', drifter_steal: 'hit' };
let acc = 0, last = performance.now(), fpsFrames = 0, fpsT = 0;
window.__fps = 0;
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  fpsFrames++; fpsT += dt;
  if (fpsT >= 1) {
    window.__fps = fpsFrames / fpsT; fpsFrames = 0; fpsT = 0;
    fpsBox.textContent = `FPS ${window.__fps.toFixed(1)} · ${innerWidth}×${innerHeight}`;
  }
  if (keys.has('ArrowLeft')) yaw += 90 * dt * settings.sens;
  if (keys.has('ArrowRight')) yaw -= 90 * dt * settings.sens;
  if (mode === 'bench') { benchFrame(now, dt); return; }
  if (mode === 'play') {
    acc += dt;
    while (acc >= TICK_DT && mode === 'play') {
      const wasPaused = world.state === 'paused';
      const input = {
        move: [(K('left') ? 1 : 0) - (K('right') ? 1 : 0), (K('up') ? 1 : 0) - (K('down') ? 1 : 0)],
        cam_yaw_deg: yaw, jump: K('jump'), interact: K('interact'), pulse: K('pulse'), dash: K('dash'), pause: pendingPause,
      };
      pendingPause = false;
      if (input.jump && world.player.grounded && !wasPaused) audio.play('jump');
      step(world, input, (name, data) => { if (SOUND_FOR[name]) audio.play(SOUND_FOR[name]); onEvent(name, data); });
      acc -= TICK_DT;
      if (world.state === 'paused' && !wasPaused) pauseScreen();
      if (world.state === 'playing' && wasPaused) screen.innerHTML = '';
      if (world.state === 'won' || world.state === 'lost') { result(); break; }
    }
  }
  render(now / 1000);
});

function render(t) {
  if (!world) { camera.position.set(Math.cos(t * 0.1) * 60, 30, Math.sin(t * 0.1) * 60); camera.lookAt(0, 0, 0); renderer.render(scene, camera); return; }
  const p = world.player;
  player.position.set(...p.pos);
  const th = (yaw * Math.PI) / 180, fx = Math.sin(th), fz = Math.cos(th);
  player.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  player.visible = !(p.invuln > 0 && Math.floor(t * 12) % 2);
  pLight.intensity = 3 + p.carried * 0.6;
  if (mode === 'bench' || mode === 'done') {
    // TICKET-04 bench camera: circle r=30, y=15, CCW from above, 15 s per lap, starts at (30,15,0), looks at origin.
    const a = (2 * Math.PI * benchT) / 15;
    camera.position.set(30 * Math.cos(a), 15, 30 * Math.sin(a));
    camera.lookAt(0, 0, 0);
  } else {
    camera.position.set(p.pos[0] - fx * 9, p.pos[1] + 5.5, p.pos[2] - fz * 9);
    camera.lookAt(p.pos[0], p.pos[1] + 1.2, p.pos[2]);
    if (shake > 0 && !settings.reduceMotion) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0));
  }
  shake = Math.max(0, shake - 0.02); flash = Math.max(0, flash - 0.02);
  $('flash').style.opacity = settings.reduceMotion ? 0 : flash;

  sync('lantern', world.lanterns);
  let lit = 0;
  for (const l of world.lanterns) {
    const m = maps.lantern.get(l.id).userData;
    const cost = l.everLit ? T.relight_cost : T.lantern_cost, frac = l.deposited / cost;
    const fuel = l.fuel / 60, low = l.lit && fuel < T.low_fuel_threshold;
    const blinkOff = low && Math.floor(t * 2) % 2 === 1; // 1 Hz slow blink when fuel < 30
    m.lamp.material.color.setHex(l.lit ? COL.lampOn : COL.lampOff);
    m.lamp.material.emissive.setHex(l.lit ? COL.lampOn : 0x221100);
    m.lamp.material.emissiveIntensity = l.lit ? (blinkOff ? 0.2 : 1.2) : frac * 0.8;
    m.lamp.scale.set(1, l.lit ? 1 : 0.8, 1); // unlit lantern is squashed 20%
    m.tear.visible = !l.lit;
    m.core.visible = l.lit && !blinkOff;
    m.light.intensity = l.lit ? (blinkOff ? 15 : 60) : frac * 6;
    m.bar.visible = m.barBg.visible = l.lit && !blinkOff;
    m.bar.scale.x = Math.max(0.001, fuel / T.fuel_max);
    m.bar.material.color.setHex(low ? (settings.colorblind ? 0xffffff : 0xff5a5f) : COL.lampOn);
    m.bar.quaternion.copy(camera.quaternion); m.barBg.quaternion.copy(camera.quaternion);
    if (l.lit) lit++;
  }
  ambient.intensity = 0.15 + 0.55 * (lit / world.lanterns.length);

  sync('mote', world.motes);
  for (const mo of world.motes) { const m = maps.mote.get(mo.id); m.position.set(mo.pos[0], mo.pos[1] + 0.8 + Math.sin(t * 3 + m.userData.seed) * 0.2, mo.pos[2]); }
  sync('shade', world.shades);
  for (const s of world.shades) {
    const m = maps.shade.get(s.id);
    m.position.set(s.pos[0], s.pos[1] + Math.sin(t * 4 + s.pos[0]) * 0.1, s.pos[2]);
    m.userData.b.material.color.setHex(s.state === 'stunned' ? COL.shadeStun : COL.shadeBody);
    m.userData.rim.material.color.setHex(settings.colorblind ? 0x00b3ff : COL.shadeRim);
    m.scale.setScalar(s.state === 'spawning' ? 0.3 + 0.7 * (1 - s.left / C.shade_spawning_ticks) : 1);
  }
  sync('drifter', world.drifters.filter((d) => d.state !== 'removed'));
  for (const d of world.drifters) { const m = maps.drifter.get(d.id); if (m) { m.position.set(...d.pos); m.rotation.y = t * 3; } }
  sync('charm', world.charms);
  for (const c of world.charms) { const m = maps.charm.get(c.id); m.visible = c.available; m.rotation.y = t * 2; }

  // HUD
  const tl = timeLeft(world);
  $('flames').textContent = '🔥'.repeat(Math.max(0, p.flames));
  const clock = $('clock');
  clock.textContent = `${String(Math.floor(tl / 60)).padStart(2, '0')}:${String(Math.floor(tl % 60)).padStart(2, '0')}`;
  clock.classList.toggle('low', tl <= 30);
  document.body.classList.toggle('cb', settings.colorblind);
  if (tl <= 30 && settings.colorblind) clock.textContent = '⚠ ' + clock.textContent;
  const sec = Math.ceil(tl);
  if (sec <= 10 && sec > 0 && sec !== lastCountdown && world.state === 'playing') { lastCountdown = sec; audio.play('tick'); }
  const need = Math.ceil(T.win_ratio * world.lanterns.length);
  $('lamps').textContent = `Đèn ${lit}/${world.lanterns.length} (cần ${need} lúc bình minh)`;
  $('score').textContent = `Điểm ${world.score}`;
  const cap = Math.min(T.capacity_max, T.carry_capacity + 2 * p.successfulLights);
  $('bar').innerHTML = Array.from({ length: cap }, (_, i) => `<i class="${i < p.carried ? 'on' : ''}"></i>`).join('') + `<b>${p.carried}/${cap}</b>`;
  $('cdDash').className = p.dashCd > 0 && p.charm === 0 ? 'cd' : '';
  $('cdDash').textContent = p.dashCd > 0 && p.charm === 0 ? `Lướt ${(p.dashCd / 60).toFixed(1)}` : 'Lướt ⇧';
  $('cdPulse').className = p.pulseCd > 0 || p.carried < T.pulse_cost ? 'cd' : '';
  $('cdPulse').textContent = p.pulseCd > 0 ? `Tỏa Sáng ${(p.pulseCd / 60).toFixed(1)}` : 'Tỏa Sáng F';
  $('cdCharm').textContent = p.charm > 0 ? `Bùa ${(p.charm / 60).toFixed(0)}s` : '';
  let nearL = null, nd = Infinity;
  for (const l of world.lanterns) { if (l.lit) continue; const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]); if (d < nd) { nd = d; nearL = l; } }
  let promptL = null, pd = Infinity;
  for (const l of world.lanterns) { if (l.lit && l.fuel >= T.fuel_max * 60) continue; const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]); if (d < pd) { pd = d; promptL = l; } }
  $('prompt').textContent = !promptL || pd > T.interact_radius ? '' : promptL.lit
    ? `E — Châm dầu (${Math.floor(promptL.fuel / 60)}/100)` : `E — Nạp ánh sáng (${promptL.deposited}/${promptL.everLit ? T.relight_cost : T.lantern_cost})`;
  const arrow = $('arrow');
  if (nearL) {
    const v = new THREE.Vector3(nearL.pos[0], nearL.pos[1] + 3, nearL.pos[2]).project(camera);
    const off = v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1;
    arrow.style.display = off ? 'block' : 'none';
    if (off) {
      let x = v.x, y = v.y; if (v.z > 1) { x = -x; y = -y; }
      const a = Math.atan2(-y, x), r = Math.min(innerWidth, innerHeight) * 0.4;
      arrow.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) rotate(${a}rad)`;
    }
  } else arrow.style.display = 'none';
  $('windWarn').textContent = world.wind.pendingDir != null ? '🍃 Gió sắp nổi…' : world.wind.active ? '🌬 Gió mạnh!' : '';
  const nowMs = performance.now();
  while (subs.length && subs[0].until < nowMs) subs.shift();
  const lows = world.lanterns.filter((l) => l.lit && l.fuel < T.low_fuel_threshold * 60).map((l) => l.id);
  const lines = subs.map((x) => x.text);
  if (lows.length) lines.push(`⚠ Đèn sắp hết dầu: ${lows.join(', ')}`);
  if (tl <= 10 && world.state === 'playing') lines.push(`⏳ Còn ${Math.ceil(tl)} giây tới bình minh`);
  $('subs').innerHTML = lines.map((x) => `<div>${x}</div>`).join('');
  const sa = $('spawnArrow');
  if (spawnArrow && spawnArrow.until > nowMs) {
    const v = new THREE.Vector3(...spawnArrow.pos).project(camera);
    let x = v.x, y = v.y; if (v.z > 1) { x = -x; y = -y; }
    const ang = Math.atan2(-y, x), r = Math.min(innerWidth, innerHeight) * 0.45;
    sa.style.display = 'block';
    sa.style.transform = `translate(${Math.cos(ang) * r}px, ${Math.sin(ang) * r}px) rotate(${ang}rad)`;
  } else sa.style.display = 'none';
  if (world.wind.pendingDir != null && !audio.windWarned) { audio.play('wind'); audio.windWarned = true; }
  if (world.wind.pendingDir == null) audio.windWarned = false;
  renderer.render(scene, camera);
}

// ---------- Benchmark scene (TICKET-04 §1) ----------
let benchT = 0, benchStart = 0, benchDts = [], benchLast = 0, heapPeak = 0;
const benchDur = Number(params.get('duration') || 30);
function startBench() {
  mode = 'bench'; hud.classList.add('hidden'); screen.innerHTML = '';
  buildLevel(1);
  world = createWorld({ seed: Number(params.get('seed') || 42), night: 1, bench: true });
}
function benchFrame(now, dt) {
  if (!benchStart) { benchStart = now; window.__benchFirstFrame?.(); }
  benchT = (now - benchStart) / 1000;
  acc += dt;
  while (acc >= TICKET_DT_SAFE) { step(world, {}); acc -= TICKET_DT_SAFE; }
  render(now / 1000);
  const mem = performance.memory?.usedJSHeapSize; if (mem > heapPeak) heapPeak = mem;
  if (benchT > 3) { if (benchLast) benchDts.push(now - benchLast); benchLast = now; }
  if (benchT >= 3 + benchDur && benchDts.length) {
    mode = 'done';
    const N = benchDts.length, sum = benchDts.reduce((a, b) => a + b, 0);
    const sorted = [...benchDts].sort((a, b) => a - b), k = Math.max(1, Math.ceil(0.01 * N));
    const worst = sorted.slice(-k), p95 = sorted[Math.min(N - 1, Math.ceil(0.95 * N) - 1)];
    const gl = renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const r2 = (v) => Math.round(v * 100) / 100;
    window.__benchDone?.({
      frames: N, avg_fps: r2((1000 * N) / sum), p1_low_fps: r2(1000 / (worst.reduce((a, b) => a + b, 0) / k)), frame_ms_p95: r2(p95),
      js_heap_peak_mb: heapPeak ? Math.round(heapPeak / 2 ** 20) : null,
      gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown GPU', viewport: `${innerWidth}x${innerHeight}`,
    });
  }
}
const TICKET_DT_SAFE = TICK_DT;

if (BENCH) startBench();
else { buildLevel(1); menu(); }
