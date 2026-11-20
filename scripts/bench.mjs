#!/usr/bin/env node
// bench_cmd (TICKET-04 §1): node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--screenshot file.png]
// Opens a real 1280x720 Chrome window (puppeteer), vsync/frame-rate limit disabled, runs the standard bench scene.
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import puppeteer from 'puppeteer';
import { ensureBuild, startServer } from './server.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seed = Number(opt('seed', 42)), duration = Number(opt('duration', 30)), out = opt('out', 'bench.json'), shot = opt('screenshot', null);

ensureBuild();
const srv = await startServer(0);
const port = srv.address().port;
const launchOpts = {
  headless: args.includes('--headless'),
  defaultViewport: null,
  args: ['--window-size=1280,720', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
};
// Prefer puppeteer's pinned Chrome (build_cmd installs it); fall back to the system Chrome if it is missing.
let browser;
try { browser = await puppeteer.launch(launchOpts); }
catch (e) { console.error('puppeteer Chrome not found, using system Chrome (channel: chrome)'); browser = await puppeteer.launch({ ...launchOpts, channel: 'chrome' }); }
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  let loadMs = null;
  await page.exposeFunction('__benchFirstFrame', () => { loadMs = Math.round(process.uptime() * 1000); });
  const done = new Promise((resolve) => page.exposeFunction('__benchDone', resolve));
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/?bench=1&seed=${seed}&duration=${duration}`);
  const r = await done;
  if (shot) await page.screenshot({ path: shot });
  const result = {
    contract_version: '1.3',
    avg_fps: r.avg_fps, p1_low_fps: r.p1_low_fps, frame_ms_p95: r.frame_ms_p95, frames: r.frames,
    load_ms: loadMs,
    peak_mem_mb: null,
    peak_mem_note: 'Web build: the game runs in a multi-process browser; per-process RSS of the renderer is not exposed to the page. JS heap peak is reported instead.',
    js_heap_peak_mb: r.js_heap_peak_mb,
    vsync_off: true,
    renderer: `three.js r170 WebGL2 in Chrome ${await browser.version()} (${r.gpu})`,
    os: `${os.type()} ${os.release()} (${os.arch()}), ${os.cpus()[0].model}, ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`,
    viewport: r.viewport,
  };
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
  srv.close();
}
process.exit(0);
