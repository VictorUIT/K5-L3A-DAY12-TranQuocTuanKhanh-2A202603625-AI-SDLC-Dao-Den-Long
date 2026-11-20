# Giả định theo phase

## Phase 0: Chuẩn bị
- Stack: Three.js + Node (JS thuần, ES modules). Lý do: logic thuần JS chạy headless bằng `node` không cần phụ thuộc gì, bản 3D chạy trên trình duyệt, release là thư mục web tĩnh, chạy được trên macOS/Linux.
- Mô phỏng dùng bước thời gian cố định 60 tick/giây, RNG có seed (mulberry32), để kết quả tất định.

## Phase 1: PRD-0 (tự giả định khi chưa có trả lời của trợ giảng)

> **Đã bị thay ở Phase 2**: mọi số liệu tự chọn dưới đây được thay bằng số chuẩn của TICKET-02. Các cách hiểu còn hiệu lực được nhắc lại ở mục Phase 2.

Số tuning: xem `game.contract.json` (nguồn thật là `src/core/tuning.js`, test kiểm tra hai bên khớp nhau).

| Chỗ mơ hồ | Cách hiểu đã chọn |
|---|---|
| Nhặt đom đóm | Tự động khi khoảng cách XZ ≤ `pickup_radius`, chỉ khi `carried < carry_capacity`; nhặt theo thứ tự danh sách. |
| Nạp đèn | `interact` (cạnh lên) trong `interact_radius` → đèn **chưa thắp** gần nhất; `amount = min(carried, lantern_cost − deposited)`, phần dư giữ lại. |
| Thắp đèn | Khi `deposited ≥ lantern_cost` → `lantern_lit`, + `per_lantern`. Hết 5 đèn → thắng `all_lit`. |
| Pulse | Trừ `pulse_cost` vào `carried`; cần `carried ≥ pulse_cost` và hết cooldown, nếu không thì không có gì xảy ra (không ghi event). Choáng mọi Bóng Mực trong `pulse_radius`, đẩy ra xa `pulse_push_m` theo hướng từ người chơi, + `per_stun` mỗi con. Event `pulse` ghi cả khi `stunned_ids` rỗng. |
| Bị chạm | Bóng Mực không choáng trong `shade_hit_radius` → −1 lửa, `dropped = floor(carried × hit_drop_ratio)`, đom đóm rơi **mất luôn** (không thành mote mới); miễn nhiễm `invuln_s`. Hết lửa → thua `no_flames`. |
| safe_radius | Chỉ áp dụng quanh đèn **đã thắp**. Bóng Mực đi vào bị đẩy ra mép vòng tròn. |
| Rơi khỏi đảo | Không có (`fall_enabled: false`): người chơi bị chặn ở mép đảo bán kính 30 m. |
| Điểm thắng | Khi thắng cộng `per_second_left × floor(time_left_s)` + `per_flame_left × flames`; thua không cộng. |
| Bộ đếm thời gian | Đổi giây → số tick nguyên (`round(s × 60)`) để tránh sai số float. |
| Thứ tự dòng trong 1 tick | Các event của bước k ghi trước snapshot của tick k+1. Khi game kết thúc giữa chừng: dừng ngay, chỉ ghi snapshot nếu tick là bội của `--snapshot-every`, rồi ghi `end`. |
| Thứ tự xử lý trong 1 bước | di chuyển → nhảy → nhặt → nạp đèn → pulse → Bóng Mực di chuyển → va chạm → sinh mới → kiểm tra bình minh. |
| Sinh ngẫu nhiên | 20 đom đóm ban đầu, thêm 1 con mỗi 4 s (tối đa 20). Bóng Mực đầu tiên ở giây 10, sau đó mỗi 25 s, tối đa 3, xuất hiện ở mép đảo. |
| Đèn mặc định | 5 đèn trên vòng tròn bán kính 20 m, L1 ở (0,0,20), cách đều 72°. |
| Bóng Mực | `pos.y = 1.0` (tâm). Trạng thái: `chase`, `stunned`. |

## Phase 2: TICKET-02 (contract v1.1)

Ticket đã làm rõ nhiều chỗ Phase 1 tự giả định. Những thay đổi so với Phase 1:
- Điểm đom đóm tính lúc **nạp**, không phải lúc nhặt (+10 mỗi con nạp). Thưởng giây còn lại ×2.
- Đom đóm rơi khi bị đánh **không mất** mà nằm trên đất 480 tick (Phase 1 giả định là mất).
- Thắng/thua xét **cuối tick** (Phase 1 kết thúc ngay khi thắp đèn cuối).
- `fall_enabled: true`: đảo không còn rào.

Chỗ ticket vẫn chưa nói, mình tự chọn:
| Chỗ mơ hồ | Cách hiểu |
|---|---|
| Thời gian trạng thái `spawning` của Bóng Mực | **Trợ giảng xác nhận:** 60 tick, không gây sát thương, mờ dần hiện ra, rồi chuyển `wander`. |
| Trạng thái ban đầu của Bóng Mực trong scenario | **Trợ giảng xác nhận:** bỏ qua spawning, bắt đầu ở `wander` (trước đó mình chọn `chase`, đã sửa). |
| `wander` | Lượn tới điểm ngẫu nhiên trong bán kính 8 m với 1.5 m/s; vẫn gây hit nếu chạm. |
| Bóng Mực và địa hình | Bóng bay lơ lửng: tâm cao 1.0 m trên mặt đất bên dưới (0 nếu là biển mây), đi xuyên tầng; tháp chuông và vùng an toàn là vật cản. |
| "chênh cao" khi chạm | |y tâm Bóng Mực − y chân Mây| ≤ 1.5. |
| Điểm xuất phát | Đêm 2: **trợ giảng xác nhận** (0,0,0), quay về +Z. Đêm 3: trợ giảng để người làm tự quyết → chọn (0,0,−30), quay về +Z: (0,0,0) nằm trong tháp chuông; (0,0,−30) ở tầng 0, nửa z < 0, xa vách và dốc, gần đèn L6/L7. |
| Đếm trần 30 đom đóm | Tính mọi đom đóm đang có (cả loại rơi). "Điểm trống" là điểm sinh chưa có đom đóm random nào. |
| 2 Bóng Mực ở tick 300 | Chọn 2 điểm khác nhau trong các điểm hợp lệ (cách người chơi ≥ 15 m), chọn bằng RNG có seed. |
| Gió Lạc: điểm sương | Dùng các điểm sinh Bóng Mực của Đêm. Đã `removed` thì vẫn nằm trong mảng `drifters` với `state: "removed"`. Một con đã bị pulse lúc chase cũng không cướp nữa. |
| `invuln` trong snapshot | **Trợ giảng xác nhận:** boolean. Các thời gian `_s` là giây còn lại, làm tròn 3 chữ số. |
| `wind.dir_deg` | Góc từ +X ngược chiều kim đồng hồ (giống bản đồ), `null` khi không có gió. Cơn gió bắt đầu ở sim_tick 1800k và kéo dài 300 tick. |
| `night_start` | **Trợ giảng xác nhận:** ghi trong bước đầu tiên, `tick: 1` (trước đó mình ghi tick 0, đã sửa). |
| Lướt trên không | Giữ nguyên độ cao (vy = 0) suốt 12 tick, sau đó rơi tiếp. Nhảy không được khi đang lướt. |
| Tăng tốc/dừng | Tức thời (0 s ≤ 0.1 s). |
| Vách / dốc | Mặt đất cao hơn chân > 0.35 m là vách; dốc (độ dốc 0.5) đi lên được. |
| `end.state` khi hết `--ticks` lúc đang tạm dừng | `"paused"`. |

## Phase 3: TICKET-03 (contract v1.2)
Quyết định thiết kế: [docs/adr/0001-lantern-fuel-and-dawn-win.md](../adr/0001-lantern-fuel-and-dawn-win.md). Thay đổi phá vỡ tương thích: [CHANGELOG.md](../../CHANGELOG.md).

| Chỗ mơ hồ | Cách hiểu |
|---|---|
| Tốc độ Bóng Mực đi tới đèn yếu | Dùng tốc độ Bóng Mực của Đêm (4.0 / 4.5 m/s), vì đây là hành vi có mục tiêu. |
| "đi về đèn tắt gần nhất như trước" | Bóng `wander` không có đèn yếu thì lượn về phía đèn tắt gần nhất với tốc độ lượn (1.5 m/s). |
| Ưu tiên khi đang `wander` | Phát hiện Mây (≤ 12 m → `chase`) xét trước, sau đó mới chọn đèn yếu. |
| Hút dầu và sự kiện | Bóng chuyển `drain` ngay trong tick tới ≤ 2 m; bắt đầu hút từ tick sau (bước 2). `fuel_drain` ghi ở mỗi tick thứ 60, 120, … tính từ lúc bắt đầu hút của từng con. |
| Đèn đầy dầu | Vì dầu hao trước bước tương tác, đèn vừa thắp ở tick trước đã còn 99.98, nên vẫn châm được 1 đom đóm. Đúng theo công thức `ceil((100 − fuel)/10)`. |
| Đẩy ra khi châm lên ≥ 30 | Dùng chung cơ chế với "đèn vừa thắp": một đèn chuyển từ không an toàn sang an toàn thì đẩy mọi Bóng Mực trong 6 m ra mép. |
| Điểm Tỏa Sáng +15 | +15 thay cho +5 (tổng), không cộng dồn. |
| `fuel` trong scenario | Số thực, đổi sang đơn vị nguyên 1/60 bằng `round(fuel × 60)`. Đèn `lit: true` không ghi `ever_lit` thì coi như đã từng sáng. |
| Điểm trong tuning | `score.per_mote = 5`, `per_second_left = 0` (bỏ thưởng thời gian). Thắp lại +40, +15 khi trúng bóng đang hút, +50 mỗi đèn sáng lúc bình minh nằm trong `C.score_*`. |
