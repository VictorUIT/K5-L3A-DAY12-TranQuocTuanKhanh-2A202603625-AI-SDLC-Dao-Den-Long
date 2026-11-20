# Bằng chứng lõi Phase 1 (làm trong cửa sổ Phase 2)

## npm test
```text
✔ game.contract.json tuning mirrors the numbers the game uses (1.3148ms)
✔ determinism: same seed/scenario/inputs give identical output, including generated ids (136.1424ms)
✔ tick model: snapshot 0 before input, N steps, snapshot cadence, end line last (44.4199ms)
✔ movement: speed, yaw rotation formula, normalisation (185.0199ms)
✔ jump raises y then lands; does not move XZ (46.2723ms)
✔ pickup: within radius (<=), respects capacity, scores per_mote (90.1388ms)
✔ deposit + light lantern on interact edge; pre-lit setup gives no points (95.5273ms)
✔ win: all lanterns lit -> game_over won/all_lit, bonus, stops early (47.0852ms)
✔ dawn: time runs out -> lost/dawn; scenario time_left_s honoured (46.1305ms)
✔ shade hit: flame lost, floor(carried*ratio) dropped, invulnerability, no_flames loss (50.9764ms)
✔ pulse: costs light, stuns within radius, pushes away, scores, cooldown (149.937ms)
✔ safe_radius: shade never enters a lit lantern radius (48.3991ms)
✔ errors: malformed inputs/scenario exit 2; bad args exit non-zero with stderr (211.9501ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

## Tất định: 2 lần chạy seed 42, 3000 tick, có input
```text
sha256 run1: e83f4ac42eb78b5b
sha256 run2: e83f4ac42eb78b5b
events:
{"type":"event","tick":467,"name":"mote_picked","data":{"carried":1}}
{"type":"event","tick":600,"name":"shade_spawned","data":{"id":"S1"}}
{"type":"event","tick":1780,"name":"player_hit","data":{"by":"shade","flames":2,"dropped":0}}
{"type":"event","tick":1870,"name":"player_hit","data":{"by":"shade","flames":1,"dropped":0}}
{"type":"event","tick":1960,"name":"player_hit","data":{"by":"shade","flames":0,"dropped":0}}
{"type":"event","tick":1960,"name":"game_over","data":{"result":"lost","reason":"no_flames"}}
{"type":"end","ticks":1960,"state":"lost","score":10}
```

## File sai định dạng → mã thoát 2
```text
error: malformed inputs JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)
exit=2
```
