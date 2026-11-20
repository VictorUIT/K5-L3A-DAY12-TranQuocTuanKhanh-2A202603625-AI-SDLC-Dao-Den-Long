// Local leaderboard rules (TICKET-04 §3). Pure functions; storage is done by the caller.
export const NAME_RE = /^[\p{L}\p{M}0-9_]{3,12}$/u; // [A-Za-z0-9_] plus Vietnamese letters with diacritics (bonus)
export const MAX_ENTRIES = 10;

export function validateName(name) {
  const n = String(name ?? '').normalize('NFC');
  return NAME_RE.test(n) ? n : null;
}

// Sort by score desc; ties: earlier achieved_at first. Keep top 10.
export function sortEntries(entries) {
  return [...entries]
    .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at))
    .slice(0, MAX_ENTRIES);
}

// ISO 8601 with local timezone offset, e.g. 2026-11-20T16:45:00+07:00
export function isoWithOffset(d = new Date()) {
  const pad = (n) => String(Math.abs(n)).padStart(2, '0');
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${off >= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

export function addEntry(entries, { name, score, nights_won, seed, achieved_at = isoWithOffset() }) {
  const n = validateName(name);
  if (!n) throw new Error('name must be 3-12 characters: letters, digits or _');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won must be 0-3');
  return sortEntries([...entries, { name: n, score, nights_won, achieved_at, seed }]);
}
