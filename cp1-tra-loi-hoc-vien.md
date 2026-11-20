# Trả lời câu hỏi CP1

Nguyên tắc chung: PRD-0 cố ý để mở nhiều chi tiết. Phần nào Test Contract không quy định thì bạn **tự chọn**, khai số trong `game.contract.json` và **ghi giả định vào README**.

## 1. Nhặt đom đóm

- PRD-0 không quy định nhặt tự động hay bấm nút, nên bạn tự chọn. Khai `pickup_radius` (và `carry_capacity` nếu game có giới hạn) trong `tuning`. Khoảng cách đo theo mặt phẳng XZ, "trong bán kính" nghĩa là ≤.
- Nếu có giới hạn thì `carried` không được vượt `carry_capacity`. Khi đầy mà vẫn đi qua đom đóm thì nhặt hay không bạn tự giả định và ghi README.
- Mỗi lần nhặt ghi một event `mote_picked` với `carried` sau khi nhặt.

## 2. Nạp đèn

- Cách nạp bạn tự quyết. Hai ràng buộc chắc chắn:
  - `deposited` không được vượt `lantern_cost`.
  - `amount` trong event `deposit` phải đúng bằng số thực sự đã chuyển, khớp với `carried` giảm đi và `deposited` tăng lên.
- Cách phổ biến là nạp `min(carried, lantern_cost - deposited)` rồi giữ lại phần dư. Chọn cách khác cũng được, miễn khai rõ và không làm mất đom đóm âm thầm.

## 3. Pulse (Tỏa Sáng)

- PRD-0 nói tỏa sáng tốn ánh sáng, nên trừ vào `carried` là cách hợp lý. Khai `pulse_cost`.
- Không đủ thì **không kích hoạt**, nên **không ghi** event `pulse`. Event `pulse` chỉ ghi khi pulse thực sự xảy ra, kèm `stunned_ids`.

## 4. Bị chạm

- `dropped` là số đom đóm thực tế rơi, tính theo `hit_drop_ratio` bạn khai. Cách làm tròn tự chọn (gợi ý `floor`), nhưng phải nhất quán và ghi README.
- Đảm bảo `dropped` ≤ `carried` trước đó, và `carried` sau đó = `carried` − `dropped`.
- Đom đóm rơi có thành mote trên đất hay không bạn tự chọn. Nếu có thì `motes_active` trong snapshot phải đếm đúng.

## 5. Thứ tự trong cùng một tick

- Event ghi **ngay khi xảy ra** trong bước đó (mang `tick = k+1`). Snapshot, nếu tới lượt, ghi **sau cùng** của bước. Vậy trong cùng một tick, event nằm **trước** snapshot.
- Khi game kết thúc giữa chừng: `game_over` là một event. Không bắt buộc thêm snapshot đặc biệt. Nếu tick đó rơi đúng lượt `--snapshot-every` thì vẫn ghi snapshot bình thường. Dòng `end` luôn là **dòng cuối cùng**.

## 6. Điểm khi thắng

- Điểm bạn tự đặt, khai ở `score.*` (`per_second_left`, `per_flame_left`, ...). `score` trong dòng `end` là điểm cuối cùng của game, nên đã gồm thưởng thắng.
- Thưởng thắng nên cộng ngay tại tick có `game_over` (won), để `score` trong `end` khớp với snapshot cuối.
- Khi thua có thưởng hay không bạn tự quyết (thường chỉ thưởng khi thắng). Ghi vào README.

## 7. Vùng an toàn quanh đèn

- PRD-0 chỉ nói Bóng Mực sợ đèn. `safe_radius` là bán kính quanh đèn mà Bóng Mực **không vào được**. Nếu game không dùng thì điền `null`.
- Áp dụng cho đèn nào bạn tự quyết, thường chỉ đèn **đã thắp** (đèn tắt không có ánh sáng).
- Bóng đang ở trong vùng lúc đèn vừa thắp thì đẩy ra hay xử lý khác cũng tự chọn, nhưng sau đó không được để bóng ở trong vùng. Ghi giả định vào README.
