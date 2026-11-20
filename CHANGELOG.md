# Changelog

## [1.0.0] Phase 4: "Bình minh" (TICKET-04, contract v1.3)
### Thêm mới
- Chế độ benchmark `scripts/bench.mjs` (Chrome 1280×720 qua puppeteer, vsync tắt, cảnh chuẩn 200 Bóng Mực / 100 đom đóm) → `bench.json`.
- Soak test `scripts/soak.mjs` (10 Đêm trong một tiến trình) → `soak.json`.
- Bảng xếp hạng cục bộ lưu trên đĩa (`~/.dao-den-long/leaderboard.json`), màn hình Bảng xếp hạng, nhập tên, lệnh `--export-leaderboard`.
- Accessibility: đổi phím (báo trùng, khôi phục mặc định), phụ đề/chỉ báo hình ảnh, giảm chuyển động, chữ lớn ×1.25, chữ UI ≥ 18 px.
- `npm start` (`scripts/play.mjs`) thay cho `npm run dev` làm `run_cmd`. Script release, Dockerfile.
### Thay đổi
- `game.contract.json`: `contract_version` 1.3, thêm `bench_cmd`, `soak_cmd`; `build_cmd` cài thêm Chrome cho bench.
- `npm test` dùng `scripts/run-tests.mjs` (Node 20 không hỗ trợ glob trong `node --test`).
- Không có breaking change với headless v1.0–v1.2.

## [Phase 3] Contract v1.2: "Đèn cạn dầu" (TICKET-03)

### Breaking changes
- **Luật thắng**: bỏ thắng sớm `all_lit`. Thắng chỉ lúc bình minh với ≥ ceil(0.6 × số đèn) đèn đang sáng → `game_over {result:"won", reason:"dawn_survived"}`. Lý do `all_lit` không còn được phát.
- **Thời lượng Đêm**: 300/330/360 s → **240/270/300 s**.
- **Đèn có nhiên liệu**: đèn sáng hao 1 fuel/s và tắt khi fuel ≤ 0 (`lantern_out`), `deposited` reset về 0. Thắp lại cần 5 đom đóm.
- **Đèn sáng nhận thêm đom đóm** (châm dầu, event `refuel`). Trước đây đèn sáng không nhận.
- **Vùng an toàn** chỉ còn ở đèn sáng có fuel ≥ 30 (trước: mọi đèn sáng).
- **Điểm**: +5/đom đóm nạp (trước +10), +100 thắp lần đầu, +40 thắp lại, +5/+15 khi Tỏa Sáng trúng Bóng Mực (+15 nếu nó đang drain), bình minh +50 + floor(fuel) mỗi đèn sáng và +50 mỗi lửa; **bỏ thưởng thời gian** (`per_second_left` = 0).
- **Sức chứa** không còn cố định 10: = 10 + 2 × số lần thắp thành công trong Đêm, tối đa 20.
- **Event `lantern_lit`** thêm trường `relight`.
- **Bóng Mực** có thêm trạng thái `drain`.

### Thêm mới
- Tuning: `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`.
- Snapshot: `lanterns[].fuel` (1 chữ số thập phân), `ever_lit`, `relit_count`; `player.capacity`.
- Scenario: `lanterns[].fuel`, `ever_lit`; `player.successful_lights`; `shades[].target_lantern_id`.
- Event: `refuel`, `lantern_out`, `fuel_drain` (mỗi 60 tick khi đang hút).
- Web: thanh dầu trên đèn, nhấp nháy 1 Hz khi fuel < 30; cài đặt "Bảng màu dễ phân biệt".

### Test
- Sửa có ghi lý do (`UPDATED Phase 3`): contract v1.2, tick model (240 s), deposit (+5), dawn.
- Thay (`REPLACED Phase 3`): "win: all lit" → "no early win".
- Thêm `tests/phase3.test.js` (9 test).

## [Phase 2] Contract v1.1: "Ba hòn đảo" (TICKET-02)
- Số liệu chuẩn, 3 Đêm, Lướt, rơi khỏi đảo, Gió Lạc, Bùa Gió, gió mạnh, tạm dừng; điểm tính lúc nạp thay vì lúc nhặt.

## [Phase 1] Contract v1.0: PRD-0
- Đêm 1, headless theo Test Contract v1.0.
