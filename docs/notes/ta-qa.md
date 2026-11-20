# Hỏi đáp với trợ giảng (nguyên văn)

## Phase 2
**Q: spawning của Bóng Mực kéo dài bao lâu?**
A: 1,0 giây (60 tick). Trong lúc đó Bóng Mực không gây sát thương, mờ dần hiện ra, rồi chuyển sang wander. Bóng Mực do scenario dựng sẵn thì bỏ qua spawning, bắt đầu ngay ở trạng thái wander.

**Q: Điểm xuất phát Đêm 2 và Đêm 3?**
A: Đêm 2: (0, 0, 0), tức tâm đảo A, quay mặt về +Z. Đêm 3: (chờ bạn quyết).

**Q: invuln trong snapshot là boolean hay số giây?**
A: Là boolean: true khi Mây đang bất tử, false khi không. Còn số tick bất tử còn lại chỉ xuất hiện ở scenario, dưới tên invuln_ticks, để dựng tình huống.

**Q: night_start ghi ở tick 0 hay tick 1?**
A: Ghi ở tick 1. Tick 0 là trạng thái sau khi dựng scenario và trước mọi bước, nên không có event nào. Event phát ra trong bước đầu tiên mang tick = 1. Test so sánh thời gian với dung sai ±2 tick, nên nếu bạn ghi ở tick 0 thì cũng không bị trượt. Dù vậy hãy nhất quán theo quy ước trên.

→ Thay đổi code tương ứng: scenario shades mặc định `wander`; `night_start` chuyển sang tick 1. Xem `docs/notes/assumptions.md`.
