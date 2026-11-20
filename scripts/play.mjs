#!/usr/bin/env node
// run_cmd: serve the game with an on-disk leaderboard and open the browser.
//   node scripts/play.mjs                              play (http://localhost:5174)
//   node scripts/play.mjs --export-leaderboard out.json  write {"entries":[...]} in rank order and exit
import { writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';
import { ensureBuild, startServer, readLeaderboard, LB_FILE } from './server.mjs';

const args = process.argv.slice(2);
const ei = args.indexOf('--export-leaderboard');
if (ei >= 0) {
  const out = args[ei + 1];
  if (!out) { console.error('error: --export-leaderboard needs a file path'); process.exit(1); }
  writeFileSync(out, JSON.stringify({ entries: readLeaderboard() }, null, 2) + '\n');
  console.log(`exported ${readLeaderboard().length} entries from ${LB_FILE} to ${out}`);
  process.exit(0);
}
ensureBuild();
const port = Number(process.env.PORT || 5174);
await startServer(port);
const url = `http://localhost:${port}`;
console.log(`Đảo Đèn Lồng: ${url}  (leaderboard: ${LB_FILE})  Ctrl+C to quit`);
if (!args.includes('--no-open')) {
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}
