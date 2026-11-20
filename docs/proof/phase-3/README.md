# Bằng chứng Phase 3 (tag `phase-3`): "Đèn cạn dầu", contract v1.2

Thiết kế: [ADR-0001](../../adr/0001-lantern-fuel-and-dawn-win.md) · Breaking changes: [CHANGELOG.md](../../../CHANGELOG.md)

## npm test (hồi quy Phase 1–2 + 9 test Phase 3)
```text
✔ game.contract.json v1.2 mirrors the standard numbers (3.0912ms)
✔ determinism on every night (incl. generated ids) (1098.9403ms)
✔ tick model: snapshot 0 before input, night_start at tick 1, N steps, cadence, end last (86.2179ms)
✔ movement: 6 m/s, yaw rotation formula, normalisation, no inputs = stand still (416.608ms)
✔ jump 7 m/s with gravity 20: airborne ~42 ticks then lands (113.2582ms)
✔ pickup: XZ <= 1.0, capacity 10, pickup itself scores 0 (232.4333ms)
✔ deposit min(carried, missing); +5 per deposited mote, +100 first light; pre-lit gives nothing (193.2079ms)
✔ interact tie-break: equal distance -> smaller id (98.117ms)
✔ no early win: lighting every lantern does not end the night (125.9075ms)
✔ dawn: lost/dawn below threshold; lighting on the last tick reaches the threshold -> won (201.9765ms)
✔ shade hit: -1 flame, floor(carried/2) dropped into 1.5-2.5 m ring (ttl 8 s), invuln 90, recoil (199.6826ms)
✔ at most one flame lost per tick; ascending id decides (104.1431ms)
✔ pulse: 3 motes, 3D radius 5 from feet+0.8, stun 120, push 4 m over 15 ticks, +5 each, cooldown 3 s (225.1528ms)
✔ safe zone: shades blocked at 6 m of a lit lantern; shades inside when lit are evicted within 30 ticks, no damage (266.6361ms)
✔ errors: malformed files exit 2, bad args non-zero with stderr (602.8617ms)
✔ scenario shades start in wander (TA answer), spawned ones in spawning for 60 ticks (226.1548ms)
✔ v1.1 snapshot shape (227.2734ms)
✔ motes: 20 at distinct points at start, +1 every 240 ticks (106.2128ms)
✔ shade schedule Night 1: 2 at tick 300, then every 480; state spawning; on r=37 ring (140.9524ms)
✔ dash: 14 m/s for 12 ticks (2.8 m), cooldown 1.5 s from start, idle uses facing (+Z) (212.2637ms)
✔ air dash keeps altitude (107.9876ms)
✔ fall off island: once, ignores invuln, -1 flame, lose all motes, respawn after 60 ticks with invuln (206.7288ms)
✔ Night 2 bridge is walkable; jump pad launches to island B (232.1718ms)
✔ Night 3: tier edges are walls, ramp leads up to tier 1, pad lands on tier 2, tower blocks (473.8299ms)
✔ Night 3 wind: every 30 s for 5 s, pushes player 2 m/s (167.151ms)
✔ charm: pickup event, 600 ticks, 7.2 m/s, dash without cooldown, respawn 2700 (216.7758ms)
✔ Gió Lạc: chase when carrying >= 5 within 15 m, steals min(3, carried), flees 240 ticks then removed (220.9475ms)
✔ Gió Lạc + pulse: chase -> flee without stealing; flee with loot -> drops all as dropped motes (208.6406ms)
✔ pause: tick advances, sim_tick/time freeze, snapshot state paused, events paused/resumed (115.7405ms)
✔ performance: a full night (21,600 ticks) finishes in <= 30 s (872.483ms)
✔ fuel: lit lantern starts at 100 and decays 1/s; snapshot has fuel/ever_lit/relit_count/capacity (110.3321ms)
✔ fuel <= 0: lantern goes out (lantern_out), deposited 0, ever_lit kept; relight costs 5 and scores 5/mote + 40 (117.8997ms)
✔ refuel: used = min(carried, ceil((100-fuel)/10)), fuel capped at 100, +5 per mote (247.2758ms)
✔ capacity = 10 + 2 x successful_lights (max 20), scenario successful_lights honoured (306.408ms)
✔ drain: wander shade goes to weak lantern (< 30), drains 5/s within 2 m, fuel_drain every 60 ticks (116.2797ms)
✔ drain -> chase when Mây within 6 m; lantern at exactly 30+ keeps its safe zone (194.9986ms)
✔ refuel to >= 30 evicts shades inside within 30 ticks without damage; pulse on a draining shade scores 15 (190.1432ms)
✔ dawn: won/dawn_survived with >= ceil(0.6 n) lit; bonus 50 + floor(fuel) per lit + 50 per flame (326.8988ms)
✔ Night durations 240 / 270 / 300 s (336.1906ms)
ℹ tests 39
ℹ pass 39
ℹ fail 0
```

## Test cũ bị luật mới thay (không skip)
| Test | Xử lý | Lý do |
|---|---|---|
| `game.contract.json v1.1 …` | sửa → v1.2 | TICKET-03 §7 |
| `tick model` | sửa thời lượng 300 → 240 s | §3 |
| `deposit …` | sửa điểm +10 → +5, thêm `relight:false` | §5, §7 |
| `win: all lit → all_lit` | **thay** bằng `no early win` | §3: bỏ thắng sớm, bỏ `all_lit` |
| `dawn …` | sửa: lý do thắng là `dawn_survived` | §3 |

## Scenario: Bóng Mực hút đèn yếu (L1 fuel 29, Mây ở xa)
```text
{"type":"event","tick":90,"name":"fuel_drain","data":{"lantern_id":"L1","shade_id":"S1","fuel":22.5}}
{"type":"event","tick":150,"name":"fuel_drain","data":{"lantern_id":"L1","shade_id":"S1","fuel":16.5}}
{"type":"event","tick":210,"name":"fuel_drain","data":{"lantern_id":"L1","shade_id":"S1","fuel":10.5}}
{"type":"event","tick":270,"name":"fuel_drain","data":{"lantern_id":"L1","shade_id":"S1","fuel":4.5}}
{"type":"event","tick":315,"name":"lantern_out","data":{"lantern_id":"L1"}}
tick 0 L1 fuel 29 lit true S1 wander
tick 100 L1 fuel 21.5 lit true S1 drain
tick 200 L1 fuel 11.5 lit true S1 drain
tick 300 L1 fuel 1.5 lit true S1 drain
tick 400 L1 fuel 0 lit false S1 wander
```
Dầu giảm ~6/s khi bị hút (1 hao + 5 hút); đèn tắt thì Bóng Mực về `wander`.

## Hiệu năng (Đêm luôn chạy tới bình minh nên dài hơn)
```text
night 1: exit 0, 303 ms, end={"type":"end","ticks":7980,"state":"lost","score":0}
night 2: exit 0, 171 ms, end={"type":"end","ticks":2380,"state":"lost","score":0}
night 3: exit 0, 304 ms, end={"type":"end","ticks":7583,"state":"lost","score":0}
```
