# Nhật ký dùng AI

Công cụ: Claude Code (VS Code extension), model Claude Opus 5.5.

| Thời điểm | Phase | Việc giao cho AI | Kết quả / AI sai ở đâu | Token / chi phí ước tính |
|---|---|---|---|---|
| CP0 | 0 | Dựng khung project (core/headless/web), harness AGENTS.md, test smoke | Lỗi glob của `node --test tests/` trên Node 24, đã sửa thành `"tests/**/*.test.js"` | _(điền từ /cost)_ |
| Phase 1 | 1 | Viết lõi game + headless v1.0 + 13 test | Lỗi float khiến bộ đếm bất tử lệch 1 tick (test bắt được) → đổi sang đếm tick nguyên. Vite lỗi với đường dẫn có dấu cách khi CSS viết inline → tách `style.css`. | _(điền từ /cost)_ |
| Phase 2 | 2 | Viết lại lõi theo TICKET-02 (số chuẩn, 3 bản đồ, Lướt, rơi, Gió Lạc, Bùa, gió, pause), contract v1.1, 29 test, web 3 Đêm | Lướt trên không giữ độ cao thiếu 1 tick (giảm bộ đếm trước khi xét) → test bắt được, đã sửa. Một test bục nhảy viết sai input (cho Mây đi tiếp ra biển) → sửa test, không sửa logic. Chưa xem bản web bằng mắt. | _(điền từ /cost)_ |
