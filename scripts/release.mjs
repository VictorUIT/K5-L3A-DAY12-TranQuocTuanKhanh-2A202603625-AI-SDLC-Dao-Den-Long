// Builds the static web release: dist/ + run instructions, packed as release/dao-den-long-web-v<version>.tar.gz
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `dao-den-long-web-v${version}`;
execSync('npx vite build', { stdio: 'inherit' });
rmSync('release', { recursive: true, force: true });
mkdirSync(`release/${name}`, { recursive: true });
cpSync('dist', `release/${name}`, { recursive: true });
writeFileSync(`release/${name}/HOW-TO-RUN.txt`, `Dao Den Long v${version} - static web build

Browsers block ES modules from file://, so serve this folder over HTTP (any one of):
  python3 -m http.server 8000      then open http://localhost:8000
  npx serve .                       then open the printed URL

Controls: WASD move, mouse drag / arrows camera, Space jump, Shift dash,
E deposit light, F pulse, Esc/P pause, F3 FPS overlay.
`);
execSync(`tar -czf ${name}.tar.gz ${name}`, { cwd: 'release', stdio: 'inherit' });
console.log(`release/${name}.tar.gz`);
