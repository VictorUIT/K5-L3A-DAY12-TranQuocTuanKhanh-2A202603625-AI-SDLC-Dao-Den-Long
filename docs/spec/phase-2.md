# Spec Phase 2: TICKET-02 "Ba hòn đảo" (acceptance criteria)

Nguồn: [docs/lab/TICKET-02.md](../lab/TICKET-02.md). Mỗi tiêu chí có test tự động tương ứng ở `tests/` (tên test trong ngoặc).

## Phần 1: Số liệu chuẩn
- AC1.1 `game.contract.json` có `contract_version: "1.1"` và tuning trùng `src/core/tuning.js` (test: *game.contract.json v1.1 mirrors*).
- AC1.2 Chạy 6 m/s, nhảy 7 m/s với g = 20 (*movement*, *jump*).
- AC1.3 Nhặt ở XZ ≤ 1.0, sức chứa 10; nhặt không cộng điểm, mỗi đom đóm **nạp** được +10 (*pickup*, *deposit*).
- AC1.4 Nạp `min(mang, thiếu)`, hòa khoảng cách thì chọn id nhỏ hơn (*deposit*, *tie-break*).
- AC1.5 Tỏa Sáng: tốn 3, bán kính 3D 5 m tính từ chân + 0.8, choáng 120 tick, đẩy 4 m trong 15 tick, +5 mỗi con, hồi chiêu 3 s (*pulse*).
- AC1.6 Vùng an toàn 6 m chặn Bóng Mực; bóng ở trong lúc đèn vừa thắp bị đẩy ra trong ≤ 30 tick và không gây sát thương (*safe zone*).
- AC1.7 Bị đánh: −1 lửa, rơi floor(mang/2) ra vành 1.5–2.5 m (TTL 480), bất tử 90, bóng chuyển recoil; tối đa 1 hit mỗi tick theo id tăng dần (*shade hit*, *at most one flame*).
- AC1.8 Thắng/thua xét sau mỗi tick, thắng đúng tick hết giờ vẫn thắng; thưởng floor(s)×2 + 50×lửa (*win*, *dawn*).
- AC1.9 Lịch sinh: đom đóm 20 + 1 mỗi 240 tick (trần 30); Bóng Mực 2 con ở tick 300 rồi theo chu kỳ của Đêm, trạng thái `spawning` (*motes*, *shade schedule*).

## Phần 2: Bản đồ
- AC2.1 Đêm 1/2/3 có đúng số đèn và vị trí theo bản đồ chuẩn (*v1.1 snapshot shape*).
- AC2.2 Đêm 2: đi qua cầu tre được; bục nhảy đưa Mây sang đảo kia và đáp an toàn (*Night 2 bridge…*).
- AC2.3 Đêm 3: mép tầng là vách, dốc dẫn lên tầng 1, bục đáp tầng 2, tháp chặn (*Night 3…*).
- AC2.4 Đêm 3: gió mỗi 30 s kéo dài 5 s, đẩy 2 m/s, có báo trước 2 s trên HUD và âm thanh (*Night 3 wind*).

## Phần 3: Tính năng mới
| Tính năng | Acceptance criteria | Test |
|---|---|---|
| Lướt | Nhấn dash → 14 m/s trong 12 tick (2.8 m) theo hướng di chuyển, đứng yên thì theo hướng mặt; hồi chiêu 90 tick tính từ lúc bắt đầu; trên không giữ độ cao; event `dash {}`. | *dash*, *air dash* |
| Rơi khỏi đảo | Y < −10 → đúng 1 lần `player_hit {by:"fall", lost}`, bỏ qua bất tử, −1 lửa, mất hết đom đóm; 60 tick sau hồi sinh ở điểm xuất phát, bất tử 90; hết lửa thì thua `no_flames`. | *fall off island* |
| Gió Lạc | Sinh ở tick 1200k (Đêm 2, 3), tối đa 2. idle→chase khi mang ≥ 5 và cách ≤ 15 m; chạm XZ ≤ 1.2 thì cướp min(3, mang) → flee 240 tick → removed. Pulse lúc chase → flee không cướp; pulse lúc flee đang mang → thả hết thành đom đóm rơi, biến mất sau 120 tick. | *Gió Lạc…* (2 test) |
| Bùa Gió | Nhặt như đom đóm → `charm_picked`, 600 tick, chạy 7.2 m/s, lướt không hồi chiêu (nhấn khi đang lướt bị bỏ qua), xuất hiện lại sau 2700 tick. | *charm* |
| Chuỗi 3 Đêm | Menu → giới thiệu Đêm (tên đảo + lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh + tổng điểm; thua → chơi lại Đêm đó. | thủ công (video/ảnh) |
| Tạm dừng | Esc/P; headless: `paused`/`resumed`, tick tăng nhưng sim_tick, thời gian, hồi chiêu đứng yên, snapshot `state:"paused"`; menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu. | *pause* + thủ công |
| Cài đặt | Âm lượng, độ nhạy chuột lưu trong localStorage. | thủ công |
| Âm thanh | Nhạc nền + hiệu ứng nhặt, thắp, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s. | thủ công |
| HUD | Lửa trên trái, đồng hồ mm:ss trên giữa (đỏ, nhấp nháy khi ≤ 30 s), đèn k/n và điểm trên phải, thanh 10 ô dưới giữa, hồi chiêu Lướt/Tỏa Sáng dưới phải, nhắc "E — Nạp ánh sáng (x/10)", mũi tên chỉ đèn chưa sáng gần nhất khi nằm ngoài màn hình. | thủ công |
| Bảng màu | Màu trong `src/web/main.js` (`COL`) và `style.css` lấy đúng hex chuẩn; ánh sáng môi trường = 0.15 + 0.55 × tỉ lệ đèn sáng. | review code |

## Phần 4: Contract v1.1
- AC4.1 `--night 1|2|3`; các giá trị khác → lỗi, mã thoát khác 0 (*errors*).
- AC4.2 Snapshot có đủ trường mới (*v1.1 snapshot shape*); trạng thái Bóng Mực thuộc `spawning, wander, chase, recoil, stunned` (*shade schedule*).
- AC4.3 Một Đêm đầy đủ 21.600 tick chạy ≤ 30 s (*performance*; đo thật ~0.3–0.5 s).
- AC4.4 Tất định trên cả 3 Đêm (*determinism*).
