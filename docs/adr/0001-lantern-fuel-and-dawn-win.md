# ADR-0001: Đèn có nhiên liệu và luật thắng lúc bình minh

- Trạng thái: Đã chấp nhận (Phase 3, TICKET-03)
- Thay thế: luật "đèn sáng là vĩnh viễn", "Bóng Mực không bao giờ vào vùng an toàn", "thắng ngay khi thắp hết đèn" (PRD-0, TICKET-02)

## Bối cảnh
Playtest cho thấy người chơi giỏi thắp hết đèn trong 2 phút rồi game kết thúc, cuối Đêm thiếu căng thẳng. Mục tiêu chuyển từ "thắp hết" sang "giữ đảo sáng tới bình minh".

## Quyết định
1. **Mô hình trạng thái đèn**: trước đây `lit` chỉ đi một chiều (tắt → sáng). Nay đèn là một vòng:
   `tắt (chưa từng sáng) → sáng(fuel) → tắt (ever_lit) → sáng(fuel)…`
   - Thêm trường `fuel`, `everLit`, `relitCount`. `deposited` chỉ có nghĩa khi đèn tắt và bị reset về 0 khi đèn tắt.
   - **Fuel lưu bằng số nguyên đơn vị 1/60** (100 = 6000): hao 1 mỗi tick, bị hút 5 mỗi tick mỗi con. Không sai số float; chỉ đổi sang số thực (1 chữ số thập phân) khi xuất snapshot/event. Cùng cách với các bộ đếm tick ở Phase 1–2.
   - Chi phí thắp phụ thuộc lịch sử: `everLit ? 5 : 10`.
   - Tương tác chia 2 nhánh rõ ràng: đèn tắt → nạp/thắp; đèn sáng chưa đầy → châm dầu. Đèn đầy không phải ứng viên.
2. **Vùng an toàn là thuộc tính suy ra** `isSafe(l) = lit && fuel ≥ 30`, không phải "đèn đã sáng". Khi một đèn *chuyển* sang an toàn (vừa thắp hoặc được châm lên ≥ 30), các Bóng Mực trong vùng bị đẩy ra trong ≤ 30 tick (dùng lại cơ chế evict của TICKET-02, không viết mới).
3. **Bóng Mực có thêm trạng thái `drain`** gắn với một đèn (`lantern`). Chỉ con đang `wander` mới chọn đèn yếu; `chase` không đổi mục tiêu. Hút được tính ở bước 2 (cùng lúc hao dầu), đèn hết dầu tắt ngay sau bước 2, đúng thứ tự ticket yêu cầu.
4. **Luật thắng**: không còn thắng sớm. Chỉ xét lúc bình minh: còn lửa và số đèn đang sáng ≥ `ceil(0.6 × n)` → `won/dawn_survived`, ngược lại `lost/dawn`. Hết lửa luôn xét trước (`no_flames`).
5. **Điểm**: hằng số mới đặt trong `C.score_*` (`src/core/tuning.js`); `tuning.score.per_second_left = 0` vì thưởng thời gian bị bỏ.

## Hệ quả
- Test cũ kiểm luật bị thay được **sửa hoặc thay**, có chú thích `UPDATED Phase 3` / `REPLACED Phase 3` ngay trên test (không skip). Xem `CHANGELOG.md`.
- Đêm luôn chạy tới bình minh (trừ khi hết lửa), nên headless một Đêm đầy đủ dài hơn; vẫn ~0.3 s cho 21.600 tick.
- Chỗ ticket chưa nói rõ được ghi ở `docs/notes/assumptions.md` (mục Phase 3).
