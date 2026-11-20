# Giả định theo phase

## Phase 0: Chuẩn bị
- Stack: Three.js + Node (JS thuần, ES modules). Lý do: logic thuần JS chạy headless bằng `node` không cần phụ thuộc gì, bản 3D chạy trên trình duyệt, release là thư mục web tĩnh, chạy được trên macOS/Linux.
- Mô phỏng dùng bước thời gian cố định 60 tick/giây, RNG có seed (mulberry32), để kết quả tất định.

## Phase 1: PRD-0 (tự giả định khi chưa có trả lời của trợ giảng; sẽ cập nhật)

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
