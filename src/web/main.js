// Rendering layer only: reads state from core/world.js, never owns game rules.
import * as THREE from 'three';
import { createWorld, step, TICK_DT } from '../core/world.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0f1a, 10, 40);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.HemisphereLight(0x8899ff, 0x111122, 0.6));
const lantern = new THREE.PointLight(0xffb347, 30, 15);
lantern.position.set(0, 3, 0);
scene.add(lantern);

const island = new THREE.Mesh(new THREE.CylinderGeometry(12, 10, 1, 32), new THREE.MeshStandardMaterial({ color: 0x2f4a3a }));
island.position.y = -0.5;
scene.add(island);
const player = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xf2e6c9 }));
scene.add(player);

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const world = createWorld({ seed: 1 });
let acc = 0, last = performance.now();
renderer.setAnimationLoop((now) => {
  acc += Math.min((now - last) / 1000, 0.25);
  last = now;
  const input = {
    moveX: (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    moveZ: (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0),
  };
  while (acc >= TICK_DT) { step(world, input); acc -= TICK_DT; }
  const p = world.player;
  player.position.set(p.x, p.y + 0.8, p.z);
  camera.position.set(p.x, p.y + 5, p.z + 8);
  camera.lookAt(player.position);
  renderer.render(scene, camera);
});
