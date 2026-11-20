// Tiny static server for dist/ + local leaderboard API stored on disk (TICKET-04 §3).
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { addEntry, sortEntries } from '../src/core/leaderboard.js';

export const DATA_DIR = process.env.DDL_DATA_DIR || join(homedir(), '.dao-den-long');
export const LB_FILE = join(DATA_DIR, 'leaderboard.json');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

export function readLeaderboard() {
  try { return sortEntries(JSON.parse(readFileSync(LB_FILE, 'utf8')).entries ?? []); } catch { return []; }
}
function writeLeaderboard(entries) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(LB_FILE, JSON.stringify({ entries }, null, 2) + '\n');
}

export function ensureBuild() {
  if (!existsSync('dist/index.html')) execSync('npx vite build', { stdio: 'inherit' });
}

export function startServer(port = 0) {
  const root = normalize('dist');
  const srv = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/leaderboard') {
      if (req.method === 'GET') { res.writeHead(200, { 'content-type': MIME['.json'] }); return res.end(JSON.stringify({ entries: readLeaderboard() })); }
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c)).on('end', () => {
          try {
            const entries = addEntry(readLeaderboard(), JSON.parse(body));
            writeLeaderboard(entries);
            res.writeHead(200, { 'content-type': MIME['.json'] }); res.end(JSON.stringify({ entries }));
          } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
        });
        return;
      }
    }
    let file = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => srv.listen(port, '127.0.0.1', () => resolve(srv)));
}
