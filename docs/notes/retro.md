# Retro: Đảo Đèn Lồng (4 phase)

## Evaluation theo phase
| Phase | Kết quả | Đánh giá |
|---|---|---|
| 1 (PRD-0) | Tag đúng hạn nhưng chỉ có khung; lõi v1.0 xong ngay sau đó | Lỡ mốc vì chuẩn bị và chờ trợ giảng. Ghi trung thực ở `docs/proof/phase-1/STATUS.md` |
| 2 (TICKET-02) | 30 test, 3 Đêm, contract v1.1, ~60 FPS | Đạt DoD. Hỏi trợ giảng 4 câu, sửa code theo câu trả lời trước hạn |
| 3 (TICKET-03) | 39 test; 5 test cũ sửa/thay có ghi lý do; ADR + CHANGELOG | Change request làm trong ~30 phút nhờ lõi tách biệt và bộ test hộp đen |
| 4 (TICKET-04) | Bench avg 507 FPS / p1 67 / load 0.8 s; soak 0 crash, RSS ×1.12; bảng xếp hạng; accessibility; v1.0.0 | Đạt các ngưỡng trên máy mình; bản web nên `peak_mem_mb` = null |

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
| `npm test` dùng glob mà Node 20 không hỗ trợ (chỉ chạy được trên Node 24 của máy mình) | Chạy thử trong Docker Linux/Node 20 | `scripts/run-tests.mjs` |
| Soak báo RSS ×1.4, tưởng là rò rỉ | In RSS sau từng Đêm: dao động, không tăng dần → do V8 nới heap | Dọn rác (gc) khi reset mỗi Đêm, ghi rõ `--expose-gc` trong `soak_cmd` |
| Ảnh chụp bench lấy sai góc camera (sau khi đo, camera quay về nhân vật) | Xem ảnh chụp | Giữ camera bay vòng cả sau khi đo |
| puppeteer không giải nén được Chrome trên Windows | Bench báo "Could not find Chrome" | Fallback sang Chrome hệ thống |

## Harness giúp nhiều nhất
- `AGENTS.md`: luật "không sửa expected để test đạt", "bộ đếm là tick nguyên", "thứ tự xử lý tick bắt buộc", "mỗi tính năng ≥ 1 scenario".
- Docker (Linux, Node 20): bắt được lỗi chỉ xuất hiện ngoài máy phát triển.
- Skill `headless-verify`: quy trình chạy test → tất định → scenario → đo hiệu năng → dán output thật vào `docs/proof/`.
- `tests/helpers.js`: `run()` gọi CLI thật và `quiet()` tắt mọi spawn ngẫu nhiên, nên viết scenario mới chỉ mất vài dòng.

## Token và chi phí
- Đến hết Phase 3: 116 lần gọi model, ~192 nghìn token output, ~20.3 triệu token đọc cache (~98% tổng). Gói Claude Pro: dùng 72% hạn mức phiên 5 giờ, 34% hạn mức tuần. Chi tiết: [ai-log.md](ai-log.md).
- Cách tiết kiệm đã dùng: một phiên agent duy nhất, không dùng sub-agent; đọc spec một lần rồi lưu file; sửa bằng patch nhỏ thay vì viết lại cả file; test chạy khoảng 2 giây nên vòng lặp sửa và kiểm rất rẻ.

## Nếu làm lại
- Chuẩn bị CP0 trước buổi lab, để giờ Phase 1 chỉ dành cho PRD-0.
- Phase 1: viết `game.contract.json` và CLI headless ngay trong 15 phút đầu, phần 3D để sau.
- Đặt câu hỏi cho trợ giảng sớm nhưng không chờ câu trả lời.
- Chạy thử trên Linux/Docker ngay từ Phase 1, vì máy chấm không phải Windows.
- Khi đổi luật lớn (Phase 3), viết ADR trước khi sửa code, để tiết kiệm token cho việc sửa test.
