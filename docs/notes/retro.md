# Retro (nháp, hoàn thiện ở CP5)

> Mục có dấu _(điền)_ cần bổ sung ở cuối buổi.

## Điều hiệu quả
- **Tách `src/core` (logic thuần, tất định) khỏi `src/web`.** Cùng một lõi phục vụ cả bản chơi lẫn headless, nên khi TICKET-02 thay toàn bộ số liệu, chỉ phải sửa một chỗ.
- **Test hộp đen gọi đúng CLI headless như máy chấm.** Mỗi điều khoản contract có một test, nên lỗi lộ ra ngay thay vì đợi test ẩn.
- **Lưu nguyên văn PRD-0, TICKET-02 và câu trả lời trợ giảng vào repo** (`docs/lab/`, `docs/notes/ta-*.md`). Agent đọc spec gốc thay vì bản tóm tắt.
- **Bảng giả định có cột nguồn**, phân biệt chỗ tự chọn với chỗ trợ giảng đã xác nhận. Khi có câu trả lời, sửa code rất nhanh (2 thay đổi, 1 commit).
- **Gắn tag sớm, dời tag khi có bản tốt hơn trước hạn.**

## Điều không hiệu quả
- **Lỡ mốc Phase 1.** CP0 (chuẩn bị) và chờ trợ giảng chiếm hết giờ Phase 1, nên tag `phase-1` chỉ có khung project. Đã ghi trung thực ở `docs/proof/phase-1/STATUS.md`. Bài học: không chờ câu trả lời; tự giả định, ghi lại, code ngay, sửa sau.
- Không đọc được tab phase chưa phát hành từ lab board (nội dung tải theo phiên của người học), nên phải dán tay.

## Những lần AI sai và cách phát hiện
| Lỗi | Phát hiện bằng | Sửa |
|---|---|---|
| Bộ đếm thời gian dùng giây số thực → lệch 1 tick | Test "invuln" (91 ≠ 90) | Mọi bộ đếm chuyển sang số tick nguyên; thêm luật vào AGENTS.md |
| `node --test tests/` không chạy trên Node 24 | Chạy `npm test` thật | Đổi sang glob `tests/**/*.test.js` |
| Vite build lỗi khi đường dẫn có dấu cách và CSS viết inline | Chạy `npm run build` thật | Tách `style.css` |
| Lướt trên không giữ độ cao thiếu 1 tick | Test "air dash" | Xét trạng thái lướt trước khi giảm bộ đếm |
| Test bục nhảy viết sai input (cho nhân vật đi tiếp ra biển) | Đọc trace JSONL của chính lần chạy | Sửa test, **không** sửa logic |
| Gõ `_fps` thay vì `__fps` khi đo FPS | Lỗi trong Console | Thêm overlay F3 hiện FPS ngay trên màn hình |

## Harness giúp nhiều nhất
- `AGENTS.md`: luật "không sửa expected để test đạt", "bộ đếm là tick nguyên", "thứ tự xử lý tick bắt buộc", "mỗi tính năng ≥ 1 scenario".
- Skill `headless-verify`: quy trình chạy test → tất định → scenario → đo hiệu năng → dán output thật vào `docs/proof/`.
- `tests/helpers.js`: `run()` gọi CLI thật và `quiet()` tắt mọi spawn ngẫu nhiên, nên viết scenario mới chỉ mất vài dòng.

## Token và chi phí
- _(điền: chạy `/cost` trong Claude Code, ghi tổng token và chi phí ước tính)_
- Cách tiết kiệm đã dùng: một phiên agent duy nhất, không dùng sub-agent; đọc spec một lần rồi lưu file; sửa bằng patch nhỏ thay vì viết lại cả file; test chạy khoảng 2 giây nên vòng lặp sửa và kiểm rất rẻ.

## Nếu làm lại
- Chuẩn bị CP0 trước buổi lab, để giờ Phase 1 chỉ dành cho PRD-0.
- Phase 1: viết `game.contract.json` và CLI headless ngay trong 15 phút đầu, phần 3D để sau.
- Đặt câu hỏi cho trợ giảng sớm nhưng không chờ câu trả lời.
- _(điền thêm sau Phase 3–4)_
