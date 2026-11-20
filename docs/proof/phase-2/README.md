# Bằng chứng Phase 2 (tag `phase-2`)

Máy: Intel i7-12800H (20 luồng), 16 GB RAM, Windows 11, Node v24.16.0.

## npm test (29 test: hồi quy Phase 1 với số chuẩn + mỗi tính năng mới ≥ 1 scenario)
```text
✔ game.contract.json v1.1 mirrors the standard numbers (1.5374ms)
✔ determinism on every night (incl. generated ids) (536.3382ms)
✔ tick model: night_start + snapshot 0 before input, N steps, cadence, end last (63.4546ms)
✔ movement: 6 m/s, yaw rotation formula, normalisation, no inputs = stand still (247.1489ms)
✔ jump 7 m/s with gravity 20: airborne ~42 ticks then lands (60.2183ms)
✔ pickup: XZ <= 1.0, capacity 10, pickup itself scores 0 (116.1375ms)
✔ deposit min(carried, missing); +10 per deposited mote, +100 per lantern; pre-lit gives nothing (123.3758ms)
✔ interact tie-break: equal distance -> smaller id (65.3481ms)
✔ win: all lit -> won/all_lit, bonus floor(s)*2 + 50*flames, stops early (61.8365ms)
✔ dawn: lost/dawn at exactly time_left_s; win on the last tick beats dawn (122.5121ms)
✔ shade hit: -1 flame, floor(carried/2) dropped into 1.5-2.5 m ring (ttl 8 s), invuln 90, recoil (113.023ms)
✔ at most one flame lost per tick; ascending id decides (59.7071ms)
✔ pulse: 3 motes, 3D radius 5 from feet+0.8, stun 120, push 4 m over 15 ticks, +5 each, cooldown 3 s (148.6791ms)
✔ safe zone: shades blocked at 6 m of a lit lantern; shades inside when lit are evicted within 30 ticks, no damage (147.4945ms)
✔ errors: malformed files exit 2, bad args non-zero with stderr (319.329ms)
✔ v1.1 snapshot shape (115.5578ms)
✔ motes: 20 at distinct points at start, +1 every 240 ticks (61.3744ms)
✔ shade schedule Night 1: 2 at tick 300, then every 480; state spawning; on r=37 ring (71.0654ms)
✔ dash: 14 m/s for 12 ticks (2.8 m), cooldown 1.5 s from start, idle uses facing (+Z) (119.2219ms)
✔ air dash keeps altitude (65.4542ms)
✔ fall off island: once, ignores invuln, -1 flame, lose all motes, respawn after 60 ticks with invuln (135.9035ms)
✔ Night 2 bridge is walkable; jump pad launches to island B (136.3247ms)
✔ Night 3: tier edges are walls, ramp leads up to tier 1, pad lands on tier 2, tower blocks (241.181ms)
✔ Night 3 wind: every 30 s for 5 s, pushes player 2 m/s (95.366ms)
✔ charm: pickup event, 600 ticks, 7.2 m/s, dash without cooldown, respawn 2700 (123.1628ms)
✔ Gió Lạc: chase when carrying >= 5 within 15 m, steals min(3, carried), flees 240 ticks then removed (130.3678ms)
✔ Gió Lạc + pulse: chase -> flee without stealing; flee with loot -> drops all as dropped motes (121.4102ms)
✔ pause: tick advances, sim_tick/time freeze, snapshot state paused, events paused/resumed (66.5614ms)
✔ performance: a full night (21,600 ticks) finishes in <= 30 s (377.7408ms)
ℹ tests 29
ℹ pass 29
ℹ fail 0
```

## Hiệu năng headless: 1 Đêm đầy đủ 21.600 tick (yêu cầu ≤ 30 s)
```text
night 1: 21600 ticks, exit 0, 219 ms
night 2: 21600 ticks, exit 0, 258 ms
night 3: 21600 ticks, exit 0, 333 ms
```

## Tất định trên 3 Đêm (seed 42, 3000 tick, có input)
```text
night 1: 51c08b564ab73241 / 51c08b564ab73241
night 2: 56e3ab85563fe107 / 56e3ab85563fe107
night 3: 8f153a605437a847 / 8f153a605437a847
```

## Ví dụ: bục nhảy Đêm 2 (đáp xuống đảo B)
```text
tick 0 pos [20,0,16.5] grounded true
tick 50 pos [36.936,4.75,10.903] grounded false
tick 90 pos [51.037,0,5.755] grounded true
```

## Chưa kiểm chứng tự động
- FPS ≥ 30 ở 1280×720: bản web có biến `window.__fps`. Cần đo thủ công trên trình duyệt và ghi lại kết quả ở đây.
- Menu/âm thanh/HUD/cài đặt: kiểm bằng mắt khi chơi (video demo).
